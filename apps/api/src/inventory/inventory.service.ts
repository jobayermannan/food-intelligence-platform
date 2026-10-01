import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { randomUUID } from "node:crypto";
import { AccessService } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import {
  batches,
  businesses,
  inventory,
  locations,
  movements,
  products,
  suppliers,
} from "../database/schema";
import { AdjustDto, ReceiveDto, TransferDto } from "./inventory.dto";

type Tx = Parameters<Parameters<DatabaseService["db"]["transaction"]>[0]>[0];
type Allocation = { batchId: string; quantity: string; unitCost: string };

@Injectable()
export class InventoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}
  value(value: string) {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new BadRequestException("Invalid decimal");
    return d;
  }
  positive(value: string) {
    const d = this.value(value);
    if (d.lte(0)) throw new BadRequestException("Quantity must be positive");
    return d;
  }
  quantity(value: Decimal, unit: string) {
    if (
      value.decimalPlaces() > 6 ||
      (["piece", "package"].includes(unit) && !value.isInteger())
    )
      throw new BadRequestException("Invalid unit precision");
    return value.toFixed(6);
  }
  convert(value: string, from: string, to: string) {
    let d = this.positive(value);
    if (from === to) return this.quantity(d, to);
    if ((from === "kg" && to === "gram") || (from === "litre" && to === "ml"))
      d = d.mul(1000);
    else if (
      (from === "gram" && to === "kg") ||
      (from === "ml" && to === "litre")
    )
      d = d.div(1000);
    else throw new BadRequestException("Unsupported unit conversion");
    return this.quantity(d, to);
  }
  private async position(
    tx: Tx,
    businessId: string,
    locationId: string,
    productId: string,
  ) {
    await tx
      .insert(inventory)
      .values({ businessId, locationId, productId })
      .onConflictDoNothing();
    const [row] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.businessId, businessId),
          eq(inventory.locationId, locationId),
          eq(inventory.productId, productId),
        ),
      )
      .for("update");
    return row;
  }
  private async operation(tx: Tx, businessId: string, key: string) {
    const found = await tx
      .select({ id: movements.id })
      .from(movements)
      .where(
        and(
          eq(movements.businessId, businessId),
          eq(movements.operationKey, key),
        ),
      )
      .limit(1);
    if (found.length) throw new ConflictException("Operation key already used");
  }
  private async location(tx: Tx, businessId: string, id: string) {
    const [found] = await tx
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.businessId, businessId),
          eq(locations.id, id),
          isNull(locations.archivedAt),
        ),
      );
    if (!found) throw new NotFoundException("Location not found");
  }
  private async product(tx: Tx, businessId: string, id: string) {
    const [found] = await tx
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.id, id),
          isNull(products.archivedAt),
        ),
      );
    if (!found) throw new NotFoundException("Product not found");
    return found;
  }
  private expiry(expiresOn: string, timezone: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn))
      throw new BadRequestException("Use YYYY-MM-DD expiry date");
    const day = new Date(`${expiresOn}T00:00:00Z`);
    if (
      Number.isNaN(day.valueOf()) ||
      day.toISOString().slice(0, 10) !== expiresOn
    )
      throw new BadRequestException("Invalid date");
    const next = new Date(day.getTime() + 86400000);
    // Calendar dates require a zoned midnight conversion; implementation uses Intl parts to solve offset.
    const target = next.toISOString().slice(0, 10);
    let guess = next.getTime();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    for (let n = 0; n < 3; n++) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(guess)).map((p) => [p.type, p.value]),
      );
      const local = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
      );
      guess += next.getTime() - local;
    }
    return new Date(guess);
  }
  async receive(userId: string, businessId: string, dto: ReceiveDto) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF"],
      dto.locationId,
    );
    return this.database.db.transaction(async (tx) => {
      await this.operation(tx, businessId, dto.operationKey);
      await this.location(tx, businessId, dto.locationId);
      const product = await this.product(tx, businessId, dto.productId);
      if (dto.supplierId) {
        const [supplier] = await tx
          .select()
          .from(suppliers)
          .where(
            and(
              eq(suppliers.businessId, businessId),
              eq(suppliers.id, dto.supplierId),
              isNull(suppliers.archivedAt),
            ),
          );
        if (!supplier) throw new NotFoundException("Supplier not found");
      }
      const quantity = this.convert(dto.quantity, dto.unit, product.baseUnit);
      const acquisition = this.value(dto.acquisitionTotal);
      if (acquisition.lt(0)) throw new BadRequestException("Invalid cost");
      const unitCost = acquisition
        .div(quantity)
        .toDecimalPlaces(6, Decimal.ROUND_HALF_UP)
        .toFixed(6);
      const [business] = await tx
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId));
      if (dto.expiryStatus === "known" && !dto.expiresOn)
        throw new BadRequestException("Expiry date required");
      if (dto.expiryStatus !== "known" && dto.expiresOn)
        throw new BadRequestException("Expiry status conflicts with date");
      const expiresAt = dto.expiresOn
        ? this.expiry(dto.expiresOn, business.timezone)
        : null;
      const position = await this.position(
        tx,
        businessId,
        dto.locationId,
        dto.productId,
      );
      const [batch] = await tx
        .insert(batches)
        .values({
          businessId,
          inventoryId: position.id,
          productId: product.id,
          supplierId: dto.supplierId,
          lotReference: dto.lotReference,
          expiryStatus: dto.expiryStatus,
          expiresAt,
          unitCost,
          remaining: quantity,
        })
        .returning();
      await tx
        .update(inventory)
        .set({
          onHand: sql`${inventory.onHand} + ${quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, position.id));
      await tx.insert(movements).values({
        businessId,
        inventoryId: position.id,
        batchId: batch.id,
        type: "PURCHASE",
        delta: quantity,
        unitCost,
        actorUserId: userId,
        operationKey: dto.operationKey,
        movementKey: `${dto.operationKey}:purchase`,
      });
      return batch;
    });
  }
  async allocate(
    tx: Tx,
    businessId: string,
    locationId: string,
    productId: string,
    quantity: string,
    userId: string,
    operationKey: string,
    saleItemId: string,
  ): Promise<Allocation[]> {
    const [position] = await tx
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.businessId, businessId),
          eq(inventory.locationId, locationId),
          eq(inventory.productId, productId),
        ),
      )
      .for("update");
    if (!position) throw new ConflictException("Insufficient stock");
    const available = await tx
      .select()
      .from(batches)
      .where(
        and(
          eq(batches.businessId, businessId),
          eq(batches.inventoryId, position.id),
          gt(batches.remaining, "0"),
          or(
            and(
              eq(batches.expiryStatus, "known"),
              gt(batches.expiresAt, new Date()),
            ),
            eq(batches.expiryStatus, "nonperishable"),
          ),
        ),
      )
      .orderBy(asc(batches.expiresAt), asc(batches.receivedAt), asc(batches.id))
      .for("update");
    let remaining = this.positive(quantity);
    const allocated: Allocation[] = [];
    for (const batch of available) {
      if (remaining.lte(0)) break;
      const used = Decimal.min(remaining, this.value(batch.remaining));
      const usedString = used.toFixed(6);
      await tx
        .update(batches)
        .set({
          remaining: sql`${batches.remaining} - ${usedString}`,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batch.id));
      await tx.insert(movements).values({
        businessId,
        inventoryId: position.id,
        batchId: batch.id,
        type: "SALE",
        delta: used.neg().toFixed(6),
        unitCost: batch.unitCost,
        actorUserId: userId,
        saleItemId,
        operationKey,
        movementKey: `${operationKey}:sale:${saleItemId}:${batch.id}`,
      });
      allocated.push({
        batchId: batch.id,
        quantity: usedString,
        unitCost: batch.unitCost,
      });
      remaining = remaining.minus(used);
    }
    if (remaining.gt(0))
      throw new ConflictException("Insufficient saleable stock");
    await tx
      .update(inventory)
      .set({
        onHand: sql`${inventory.onHand} - ${quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, position.id));
    return allocated;
  }
  async transfer(userId: string, businessId: string, dto: TransferDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    if (dto.sourceLocationId === dto.destinationLocationId)
      throw new BadRequestException("Different locations required");
    return this.database.db.transaction(async (tx) => {
      await this.operation(tx, businessId, dto.operationKey);
      await this.location(tx, businessId, dto.sourceLocationId);
      await this.location(tx, businessId, dto.destinationLocationId);
      const [batch] = await tx
        .select()
        .from(batches)
        .where(
          and(eq(batches.businessId, businessId), eq(batches.id, dto.batchId)),
        );
      if (!batch) throw new NotFoundException();
      const [source] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.businessId, businessId),
            eq(inventory.id, batch.inventoryId),
          ),
        );
      if (!source || source.locationId !== dto.sourceLocationId)
        throw new NotFoundException();
      const count = this.quantity(
        this.positive(dto.quantity),
        (await this.product(tx, businessId, batch.productId)).baseUnit,
      );
      const first = [dto.sourceLocationId, dto.destinationLocationId].sort();
      for (const id of first)
        await this.position(tx, businessId, id, batch.productId);
      const [locked] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batch.id))
        .for("update");
      if (this.value(locked.remaining).lt(count))
        throw new ConflictException("Insufficient stock");
      const [dest] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.businessId, businessId),
            eq(inventory.locationId, dto.destinationLocationId),
            eq(inventory.productId, batch.productId),
          ),
        );
      const [destBatch] = await tx
        .insert(batches)
        .values({
          businessId,
          inventoryId: dest.id,
          productId: batch.productId,
          supplierId: batch.supplierId,
          lotReference: batch.lotReference,
          provenanceReference: batch.id,
          expiryStatus: batch.expiryStatus,
          expiresAt: batch.expiresAt,
          unitCost: batch.unitCost,
          remaining: count,
        })
        .returning();
      await tx
        .update(batches)
        .set({
          remaining: sql`${batches.remaining} - ${count}`,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batch.id));
      await tx
        .update(inventory)
        .set({
          onHand: sql`${inventory.onHand} - ${count}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, source.id));
      await tx
        .update(inventory)
        .set({
          onHand: sql`${inventory.onHand} + ${count}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, dest.id));
      const group = randomUUID();
      await tx.insert(movements).values([
        {
          businessId,
          inventoryId: source.id,
          batchId: batch.id,
          type: "TRANSFER_OUT",
          delta: this.value(count).neg().toFixed(6),
          unitCost: batch.unitCost,
          actorUserId: userId,
          transferGroupId: group,
          operationKey: dto.operationKey,
          movementKey: `${dto.operationKey}:out`,
        },
        {
          businessId,
          inventoryId: dest.id,
          batchId: destBatch.id,
          type: "TRANSFER_IN",
          delta: count,
          unitCost: batch.unitCost,
          actorUserId: userId,
          transferGroupId: group,
          operationKey: dto.operationKey,
          movementKey: `${dto.operationKey}:in`,
        },
      ]);
      return { transferId: group, destinationBatchId: destBatch.id };
    });
  }
  async adjust(userId: string, businessId: string, dto: AdjustDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    return this.database.db.transaction(async (tx) => {
      await this.operation(tx, businessId, dto.operationKey);
      const [batch] = await tx
        .select()
        .from(batches)
        .where(
          and(eq(batches.businessId, businessId), eq(batches.id, dto.batchId)),
        );
      if (!batch) throw new NotFoundException();
      const [position] = await tx
        .select()
        .from(inventory)
        .where(eq(inventory.id, batch.inventoryId))
        .for("update");
      if (position.locationId !== dto.locationId) throw new NotFoundException();
      const [lockedBatch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batch.id))
        .for("update");
      const delta = this.value(dto.delta);
      if (delta.eq(0))
        throw new BadRequestException("Nonzero adjustment required");
      this.quantity(
        delta,
        (await this.product(tx, businessId, batch.productId)).baseUnit,
      );
      if (
        this.value(lockedBatch.remaining).plus(delta).lt(0) ||
        this.value(position.onHand).plus(delta).lt(0)
      )
        throw new ConflictException("Insufficient stock");
      await tx
        .update(batches)
        .set({
          remaining: sql`${batches.remaining} + ${dto.delta}`,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batch.id));
      await tx
        .update(inventory)
        .set({
          onHand: sql`${inventory.onHand} + ${dto.delta}`,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, position.id));
      const [movement] = await tx
        .insert(movements)
        .values({
          businessId,
          inventoryId: position.id,
          batchId: batch.id,
          type: "ADJUSTMENT",
          delta: dto.delta,
          unitCost: batch.unitCost,
          actorUserId: userId,
          operationKey: dto.operationKey,
          movementKey: `${dto.operationKey}:adjust`,
          reason: dto.reason,
        })
        .returning();
      return movement;
    });
  }
  async positions(userId: string, businessId: string) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    if (scope.locations !== "all" && !scope.locations.length) return [];
    return this.database.db
      .select()
      .from(inventory)
      .where(
        scope.locations === "all"
          ? eq(inventory.businessId, businessId)
          : and(
              eq(inventory.businessId, businessId),
              inArray(inventory.locationId, scope.locations),
            ),
      )
      .limit(100);
  }
  async listBatches(userId: string, businessId: string, locationId: string) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF", "VIEWER"],
      locationId,
    );
    return this.database.db
      .select({ batch: batches, position: inventory })
      .from(batches)
      .innerJoin(inventory, eq(batches.inventoryId, inventory.id))
      .where(
        and(
          eq(inventory.businessId, businessId),
          eq(inventory.locationId, locationId),
        ),
      )
      .limit(100);
  }
  async listMovements(userId: string, businessId: string, locationId: string) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF", "VIEWER"],
      locationId,
    );
    return this.database.db
      .select({ movement: movements })
      .from(movements)
      .innerJoin(inventory, eq(movements.inventoryId, inventory.id))
      .where(
        and(
          eq(movements.businessId, businessId),
          eq(inventory.locationId, locationId),
        ),
      )
      .limit(100);
  }
}
