import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { createHash, randomUUID } from "node:crypto";
import { AccessService } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import {
  allocations,
  batches,
  businesses,
  discounts,
  inventory,
  movements,
  orders,
  products,
  returnItems,
  saleItems,
  saleReturns,
  wasteRecords,
} from "../database/schema";
import { InventoryService } from "../inventory/inventory.service";
import { CreateSaleDto, CreateReturnDto } from "./sales.dto";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

@Injectable()
export class SalesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
    private readonly stock: InventoryService,
  ) {}
  private rounding(currency: string) {
    try {
      return (
        new Intl.NumberFormat("en", {
          style: "currency",
          currency,
        }).resolvedOptions().maximumFractionDigits ?? 2
      );
    } catch {
      return 2;
    }
  }
  private amount(value: Decimal, currency: string) {
    return value
      .toDecimalPlaces(this.rounding(currency), Decimal.ROUND_HALF_UP)
      .toFixed(6);
  }

  async sell(userId: string, businessId: string, dto: CreateSaleDto) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF"],
      dto.locationId,
    );
    const requestHash = digest(dto);
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.businessId, businessId),
            eq(orders.requestKey, dto.requestKey),
          ),
        );
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new ConflictException("Operation key reused");
        return existing;
      }
      const [business] = await tx
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId));
      if (!business) throw new NotFoundException();
      const lines = [];
      let gross = new Decimal(0),
        discountTotal = new Decimal(0),
        netTotal = new Decimal(0),
        taxTotal = new Decimal(0);
      for (const input of dto.lines) {
        const [product] = await tx
          .select()
          .from(products)
          .where(
            and(
              eq(products.businessId, businessId),
              eq(products.id, input.productId),
            ),
          );
        if (!product || product.archivedAt)
          throw new NotFoundException("Product not found");
        const quantity = this.stock.quantity(
          this.stock.positive(input.quantity),
          product.baseUnit,
        );
        let percent = new Decimal(0);
        if (input.discountId) {
          const [approved] = await tx
            .select()
            .from(discounts)
            .where(
              and(
                eq(discounts.businessId, businessId),
                eq(discounts.id, input.discountId),
                eq(discounts.productId, product.id),
              ),
            );
          if (
            !approved ||
            approved.validFrom > new Date() ||
            approved.validUntil <= new Date()
          )
            throw new BadRequestException("Discount not valid");
          percent = new Decimal(approved.percent);
        }
        const lineGross = new Decimal(
          this.amount(
            new Decimal(quantity).mul(product.sellingPrice),
            business.currency,
          ),
        );
        const lineDiscount = new Decimal(
          this.amount(lineGross.mul(percent).div(100), business.currency),
        );
        const lineNet = new Decimal(
          this.amount(lineGross.minus(lineDiscount), business.currency),
        );
        const lineTax = new Decimal(
          this.amount(lineNet.mul(business.defaultTaxRate), business.currency),
        );
        gross = gross.plus(lineGross);
        discountTotal = discountTotal.plus(lineDiscount);
        netTotal = netTotal.plus(lineNet);
        taxTotal = taxTotal.plus(lineTax);
        lines.push({
          product,
          quantity,
          discountId: input.discountId,
          percent,
          lineGross,
          lineDiscount,
          lineNet,
          lineTax,
        });
      }
      const [order] = await tx
        .insert(orders)
        .values({
          businessId,
          locationId: dto.locationId,
          createdByUserId: userId,
          orderNumber: randomUUID(),
          currency: business.currency,
          grossAmount: this.amount(gross, business.currency),
          discountAmount: this.amount(discountTotal, business.currency),
          netAmount: this.amount(netTotal, business.currency),
          taxAmount: this.amount(taxTotal, business.currency),
          totalAmount: this.amount(netTotal.plus(taxTotal), business.currency),
          requestKey: dto.requestKey,
          requestHash,
        })
        .returning();
      for (const line of lines) {
        const [item] = await tx
          .insert(saleItems)
          .values({
            businessId,
            orderId: order.id,
            productId: line.product.id,
            discountId: line.discountId,
            productName: line.product.name,
            sku: line.product.sku,
            baseUnit: line.product.baseUnit,
            quantity: line.quantity,
            unitPrice: line.product.sellingPrice,
            grossAmount: this.amount(line.lineGross, business.currency),
            discountPercent: line.percent.toFixed(3),
            discountAmount: this.amount(line.lineDiscount, business.currency),
            netAmount: this.amount(line.lineNet, business.currency),
            taxRate: business.defaultTaxRate,
            taxAmount: this.amount(line.lineTax, business.currency),
            totalAmount: this.amount(
              line.lineNet.plus(line.lineTax),
              business.currency,
            ),
          })
          .returning();
        const assigned = await this.stock.allocate(
          tx,
          businessId,
          dto.locationId,
          line.product.id,
          line.quantity,
          userId,
          dto.requestKey,
          item.id,
        );
        if (line.discountId) {
          const [rule] = await tx
            .select()
            .from(discounts)
            .where(eq(discounts.id, line.discountId));
          if (
            rule.batchId &&
            !assigned.every((a) => a.batchId === rule.batchId)
          )
            throw new BadRequestException(
              "Batch discount not applicable to all stock",
            );
        }
        await tx.insert(allocations).values(
          assigned.map((a) => ({
            businessId,
            saleItemId: item.id,
            batchId: a.batchId,
            quantity: a.quantity,
            unitCost: a.unitCost,
          })),
        );
      }
      return order;
    });
  }
  async list(userId: string, businessId: string, locationId?: string) {
    const scope = await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF", "VIEWER"],
      locationId,
    );
    if (scope.locations !== "all" && !scope.locations.length) return [];
    const allowed =
      scope.locations === "all"
        ? locationId
          ? and(
              eq(orders.businessId, businessId),
              eq(orders.locationId, locationId),
            )
          : eq(orders.businessId, businessId)
        : and(
            eq(orders.businessId, businessId),
            inArray(orders.locationId, scope.locations),
          );
    return this.database.db.select().from(orders).where(allowed).limit(100);
  }
  async detail(userId: string, businessId: string, id: string) {
    const [order] = await this.database.db
      .select()
      .from(orders)
      .where(and(eq(orders.businessId, businessId), eq(orders.id, id)));
    if (!order) throw new NotFoundException();
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF", "VIEWER"],
      order.locationId,
    );
    const items = await this.database.db
      .select()
      .from(saleItems)
      .where(
        and(eq(saleItems.businessId, businessId), eq(saleItems.orderId, id)),
      );
    return { ...order, items };
  }
  async returnSale(
    userId: string,
    businessId: string,
    orderId: string,
    dto: CreateReturnDto,
  ) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const requestHash = digest(dto);
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(saleReturns)
        .where(
          and(
            eq(saleReturns.businessId, businessId),
            eq(saleReturns.requestKey, dto.requestKey),
          ),
        );
      if (existing) {
        if (
          existing.requestHash !== requestHash ||
          existing.orderId !== orderId
        )
          throw new ConflictException("Operation key reused");
        return existing;
      }
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.businessId, businessId), eq(orders.id, orderId)))
        .for("update");
      if (!order) throw new NotFoundException();
      if (
        new Set(dto.lines.map((l) => l.allocationId)).size !== dto.lines.length
      )
        throw new BadRequestException("Duplicate allocation");
      const ids = dto.lines.map((l) => l.allocationId).sort();
      const rows = await tx
        .select({ allocation: allocations, item: saleItems, batch: batches })
        .from(allocations)
        .innerJoin(saleItems, eq(allocations.saleItemId, saleItems.id))
        .innerJoin(batches, eq(allocations.batchId, batches.id))
        .where(
          and(
            eq(allocations.businessId, businessId),
            inArray(allocations.id, ids),
          ),
        );
      if (
        rows.length !== ids.length ||
        rows.some((r) => r.item.orderId !== orderId)
      )
        throw new NotFoundException("Allocation not found");
      const byId = new Map(rows.map((r) => [r.allocation.id, r]));
      const returnedByItem = new Map<
        string,
        { quantity: Decimal; net: Decimal; tax: Decimal }
      >();
      const lineResults = [];
      let net = new Decimal(0),
        tax = new Decimal(0);
      for (const input of dto.lines) {
        const row = byId.get(input.allocationId)!;
        const count = new Decimal(
          this.stock.quantity(
            this.stock.positive(input.quantity),
            row.item.baseUnit,
          ),
        );
        const restocked = this.stock.value(input.restocked),
          disposed = this.stock.value(input.disposed);
        if (
          restocked.lt(0) ||
          disposed.lt(0) ||
          restocked.plus(disposed).gt(count)
        )
          throw new BadRequestException("Invalid disposition");
        if (
          restocked.gt(0) &&
          (row.batch.expiryStatus === "unknown" ||
            (row.batch.expiresAt && row.batch.expiresAt <= new Date()))
        )
          throw new BadRequestException("Unsafe batch cannot be restocked");
        const prior = await tx
          .select({
            quantity: returnItems.quantity,
            net: returnItems.netAmount,
            tax: returnItems.taxAmount,
          })
          .from(returnItems)
          .where(eq(returnItems.allocationId, row.allocation.id));
        const used = prior.reduce((a, r) => a.plus(r.quantity), new Decimal(0));
        if (used.plus(count).gt(row.allocation.quantity))
          throw new ConflictException("Return exceeds original quantity");
        const allItemPrior = await tx
          .select({
            quantity: returnItems.quantity,
            net: returnItems.netAmount,
            tax: returnItems.taxAmount,
          })
          .from(returnItems)
          .where(eq(returnItems.saleItemId, row.item.id));
        const pending = returnedByItem.get(row.item.id) ?? {
          quantity: new Decimal(0),
          net: new Decimal(0),
          tax: new Decimal(0),
        };
        const itemReturned = allItemPrior.reduce(
          (a, r) => a.plus(r.quantity),
          pending.quantity,
        );
        if (itemReturned.plus(count).gt(row.item.quantity))
          throw new ConflictException("Return exceeds original item quantity");
        const full = itemReturned.plus(count).eq(row.item.quantity);
        const itemNet = full
          ? new Decimal(row.item.netAmount).minus(
              allItemPrior.reduce((a, r) => a.plus(r.net), pending.net),
            )
          : new Decimal(
              this.amount(
                new Decimal(row.item.netAmount)
                  .mul(count)
                  .div(row.item.quantity),
                order.currency,
              ),
            );
        const itemTax = full
          ? new Decimal(row.item.taxAmount).minus(
              allItemPrior.reduce((a, r) => a.plus(r.tax), pending.tax),
            )
          : new Decimal(
              this.amount(
                new Decimal(row.item.taxAmount)
                  .mul(count)
                  .div(row.item.quantity),
                order.currency,
              ),
            );
        returnedByItem.set(row.item.id, {
          quantity: pending.quantity.plus(count),
          net: pending.net.plus(itemNet),
          tax: pending.tax.plus(itemTax),
        });
        net = net.plus(itemNet);
        tax = tax.plus(itemTax);
        lineResults.push({ row, count, restocked, disposed, itemNet, itemTax });
      }
      const [record] = await tx
        .insert(saleReturns)
        .values({
          businessId,
          locationId: order.locationId,
          orderId,
          reason: dto.reason,
          approvedByUserId: userId,
          requestKey: dto.requestKey,
          requestHash,
          netAmount: this.amount(net, order.currency),
          taxAmount: this.amount(tax, order.currency),
          totalAmount: this.amount(net.plus(tax), order.currency),
        })
        .returning();
      for (const result of lineResults) {
        const { row, count, restocked, disposed, itemNet, itemTax } = result;
        const [line] = await tx
          .insert(returnItems)
          .values({
            businessId,
            returnId: record.id,
            saleItemId: row.item.id,
            allocationId: row.allocation.id,
            quantity: count.toFixed(6),
            restocked: restocked.toFixed(6),
            disposed: disposed.toFixed(6),
            netAmount: this.amount(itemNet, order.currency),
            taxAmount: this.amount(itemTax, order.currency),
            totalAmount: this.amount(itemNet.plus(itemTax), order.currency),
            unitCost: row.allocation.unitCost,
          })
          .returning();
        if (restocked.gt(0)) {
          const [position] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.id, row.batch.inventoryId))
            .for("update");
          await tx
            .update(batches)
            .set({
              remaining: sql`${batches.remaining} + ${restocked.toFixed(6)}`,
              updatedAt: new Date(),
            })
            .where(eq(batches.id, row.batch.id));
          await tx
            .update(inventory)
            .set({
              onHand: sql`${inventory.onHand} + ${restocked.toFixed(6)}`,
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, position.id));
          await tx.insert(movements).values({
            businessId,
            inventoryId: position.id,
            batchId: row.batch.id,
            type: "RETURN",
            delta: restocked.toFixed(6),
            unitCost: row.allocation.unitCost,
            actorUserId: userId,
            returnItemId: line.id,
            operationKey: dto.requestKey,
            movementKey: `${dto.requestKey}:return:${line.id}`,
          });
        }
        if (disposed.gt(0))
          await tx.insert(wasteRecords).values({
            businessId,
            locationId: order.locationId,
            productId: row.item.productId,
            batchId: row.batch.id,
            returnItemId: line.id,
            origin: "CUSTOMER_RETURN",
            reason: "damaged",
            notes: dto.reason,
            quantity: disposed.toFixed(6),
            unitCost: row.allocation.unitCost,
            totalCost: this.amount(
              disposed.mul(row.allocation.unitCost),
              order.currency,
            ),
            actorUserId: userId,
            operationKey: `${dto.requestKey}:return-waste:${line.id}`,
          });
      }
      return record;
    });
  }
}
