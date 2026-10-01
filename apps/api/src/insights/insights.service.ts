import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { AnyPgColumn } from "drizzle-orm/pg-core";
import { AccessService, Scope } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import {
  batches,
  businesses,
  discounts,
  inventory,
  orders,
  products,
  saleItems,
  saleReturns,
  wasteRecords,
} from "../database/schema";
import { ApproveDiscountDto, RecommendationDto } from "./insights.dto";

@Injectable()
export class InsightsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}
  private locations(scope: Scope, column: AnyPgColumn) {
    return scope.locations === "all"
      ? sql`true`
      : scope.locations.length
        ? inArray(column, scope.locations)
        : sql`false`;
  }
  async expiry(
    userId: string,
    businessId: string,
    locationId?: string,
    productId?: string,
  ) {
    const scope = await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF", "VIEWER"],
      locationId,
    );
    const [business] = await this.database.db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId));
    const now = Date.now();
    const rows = await this.database.db
      .select({
        batch: batches,
        locationId: inventory.locationId,
        productName: products.name,
      })
      .from(batches)
      .innerJoin(inventory, eq(batches.inventoryId, inventory.id))
      .innerJoin(products, eq(batches.productId, products.id))
      .where(
        and(
          eq(batches.businessId, businessId),
          this.locations(scope, inventory.locationId),
          locationId ? eq(inventory.locationId, locationId) : sql`true`,
          productId ? eq(batches.productId, productId) : sql`true`,
          sql`${batches.remaining} > 0`,
        ),
      )
      .limit(1000);
    return rows.map((r) => ({
      ...r,
      valueAtRisk: new Decimal(r.batch.remaining)
        .mul(r.batch.unitCost)
        .toFixed(6),
      classification:
        r.batch.expiryStatus === "nonperishable"
          ? "NONPERISHABLE"
          : r.batch.expiryStatus === "unknown"
            ? "UNKNOWN"
            : !r.batch.expiresAt
              ? "UNKNOWN"
              : r.batch.expiresAt.getTime() <= now
                ? "EXPIRED"
                : r.batch.expiresAt.getTime() - now <=
                    business.expiryCriticalHours * 3600000
                  ? "CRITICAL"
                  : r.batch.expiresAt.getTime() - now <=
                      business.expiryWarningHours * 3600000
                    ? "WARNING"
                    : "SAFE",
    }));
  }
  async recommendation(
    userId: string,
    businessId: string,
    dto: RecommendationDto,
  ) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "VIEWER"],
      dto.locationId,
    );
    const [product] = await this.database.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.id, dto.productId),
        ),
      );
    if (!product) throw new NotFoundException();
    const risk = (
      await this.expiry(userId, businessId, dto.locationId, dto.productId)
    ).filter((r) => ["CRITICAL", "WARNING"].includes(r.classification));
    const [position] = await this.database.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.businessId, businessId),
          eq(inventory.locationId, dto.locationId),
          eq(inventory.productId, dto.productId),
        ),
      );
    const [velocity] = await this.database.db
      .select({ quantity: sql<string>`coalesce(sum(${saleItems.quantity}),0)` })
      .from(saleItems)
      .innerJoin(orders, eq(saleItems.orderId, orders.id))
      .where(
        and(
          eq(orders.businessId, businessId),
          eq(orders.locationId, dto.locationId),
          eq(saleItems.productId, dto.productId),
          gte(orders.completedAt, new Date(Date.now() - 14 * 86400000)),
        ),
      );
    const daily = new Decimal(velocity?.quantity ?? "0").div(14);
    const eligible = position
      ? await this.database.db
          .select({ remaining: batches.remaining })
          .from(batches)
          .where(
            and(
              eq(batches.businessId, businessId),
              eq(batches.inventoryId, position.id),
              sql`${batches.remaining} > 0`,
              sql`(${batches.expiryStatus} = 'nonperishable' or (${batches.expiryStatus} = 'known' and ${batches.expiresAt} > now()))`,
            ),
          )
      : [];
    const stock = eligible.reduce(
      (sum, row) => sum.plus(row.remaining),
      new Decimal(0),
    );
    const soonest = risk
      .map((r) => r.batch.expiresAt?.getTime() ?? Infinity)
      .reduce((a, b) => Math.min(a, b), Infinity);
    const days = Number.isFinite(soonest)
      ? Math.max(0, (soonest - Date.now()) / 86400000)
      : null;
    const excess =
      days === null
        ? new Decimal(0)
        : Decimal.max(0, stock.minus(daily.mul(days)));
    const percent = days === null || excess.eq(0) ? 0 : days <= 1 ? 30 : 20;
    return {
      label: "Baseline recommendation",
      productId: dto.productId,
      locationId: dto.locationId,
      recommendedPercent: percent,
      estimatedExcessQuantity: excess.toFixed(6),
      urgency: days === null ? "NONE" : days <= 1 ? "CRITICAL" : "WARNING",
      reasons:
        days === null
          ? ["No near-expiry batch"]
          : velocity?.quantity === "0"
            ? [
                "Near-expiry stock",
                "No verified recent sales; velocity estimate is weak",
              ]
            : ["Near-expiry stock", "Stock exceeds recent sales velocity"],
      algorithmVersion: "rules-v1",
    };
  }
  async approve(userId: string, businessId: string, dto: ApproveDiscountDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const percent = new Decimal(dto.percent);
    if (
      percent.lte(0) ||
      percent.gt(50) ||
      new Date(dto.validUntil) <= new Date(dto.validFrom)
    )
      throw new BadRequestException("Invalid discount policy");
    const [product] = await this.database.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.businessId, businessId),
          eq(products.id, dto.productId),
        ),
      );
    if (!product) throw new NotFoundException();
    const applicable = await this.database.db
      .select({ unitCost: batches.unitCost, id: batches.id })
      .from(batches)
      .where(
        and(
          eq(batches.businessId, businessId),
          eq(batches.productId, dto.productId),
          sql`${batches.remaining} > 0`,
          dto.batchId ? eq(batches.id, dto.batchId) : sql`true`,
        ),
      );
    if (dto.batchId && !applicable.length) throw new NotFoundException();
    const discounted = new Decimal(product.sellingPrice).mul(
      new Decimal(1).minus(percent.div(100)),
    );
    if (applicable.some((batch) => discounted.lt(batch.unitCost)))
      throw new BadRequestException("Below batch cost");
    const [rule] = await this.database.db
      .insert(discounts)
      .values({
        businessId,
        productId: dto.productId,
        batchId: dto.batchId,
        percent: percent.toFixed(3),
        validFrom: new Date(dto.validFrom),
        validUntil: new Date(dto.validUntil),
        explanation: dto.explanation,
        approvedByUserId: userId,
      })
      .returning();
    return rule;
  }
  async analytics(
    userId: string,
    businessId: string,
    kind: string,
    locationId?: string,
  ) {
    const scope = await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "VIEWER"],
      locationId,
    );
    const scoped = (column: AnyPgColumn) =>
      and(
        this.locations(scope, column),
        locationId ? eq(column, locationId) : sql`true`,
      );
    if (kind === "inventory") {
      const rows = await this.database.db
        .select({
          productId: inventory.productId,
          locationId: inventory.locationId,
          onHand: inventory.onHand,
          reorderLevel: inventory.reorderLevel,
          unit: products.baseUnit,
          value: sql<string>`coalesce(sum(${batches.remaining} * ${batches.unitCost}),0)`,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .leftJoin(batches, eq(inventory.id, batches.inventoryId))
        .where(
          and(
            eq(inventory.businessId, businessId),
            scoped(inventory.locationId),
          ),
        )
        .groupBy(
          inventory.productId,
          inventory.locationId,
          inventory.onHand,
          inventory.reorderLevel,
          products.baseUnit,
        )
        .limit(100);
      return rows.map((r) => ({
        ...r,
        lowStock: new Decimal(r.onHand).lte(r.reorderLevel),
      }));
    }
    if (kind === "sales" || kind === "revenue") {
      const rows = await this.database.db
        .select({
          locationId: orders.locationId,
          gross: sql<string>`coalesce(sum(${orders.grossAmount}),0)`,
          discounts: sql<string>`coalesce(sum(${orders.discountAmount}),0)`,
          net: sql<string>`coalesce(sum(${orders.netAmount}),0)`,
          tax: sql<string>`coalesce(sum(${orders.taxAmount}),0)`,
        })
        .from(orders)
        .where(
          and(eq(orders.businessId, businessId), scoped(orders.locationId)),
        )
        .groupBy(orders.locationId)
        .limit(100);
      const returns = await this.database.db
        .select({
          locationId: saleReturns.locationId,
          net: sql<string>`coalesce(sum(${saleReturns.netAmount}),0)`,
          tax: sql<string>`coalesce(sum(${saleReturns.taxAmount}),0)`,
        })
        .from(saleReturns)
        .where(
          and(
            eq(saleReturns.businessId, businessId),
            scoped(saleReturns.locationId),
          ),
        )
        .groupBy(saleReturns.locationId)
        .limit(100);
      return { sales: rows, returns };
    }
    if (kind === "waste") {
      return this.database.db
        .select({
          locationId: wasteRecords.locationId,
          origin: wasteRecords.origin,
          productId: wasteRecords.productId,
          quantity: sql<string>`sum(${wasteRecords.quantity})`,
          cost: sql<string>`sum(${wasteRecords.totalCost})`,
        })
        .from(wasteRecords)
        .where(
          and(
            eq(wasteRecords.businessId, businessId),
            scoped(wasteRecords.locationId),
          ),
        )
        .groupBy(
          wasteRecords.locationId,
          wasteRecords.origin,
          wasteRecords.productId,
        )
        .limit(100);
    }
    if (kind === "products") {
      return this.database.db
        .select({
          productId: saleItems.productId,
          quantity: sql<string>`sum(${saleItems.quantity})`,
          net: sql<string>`sum(${saleItems.netAmount})`,
        })
        .from(saleItems)
        .innerJoin(orders, eq(saleItems.orderId, orders.id))
        .where(
          and(eq(orders.businessId, businessId), scoped(orders.locationId)),
        )
        .groupBy(saleItems.productId)
        .limit(100);
    }
    if (kind === "expiry") return this.expiry(userId, businessId, locationId);
    throw new NotFoundException();
  }
}
