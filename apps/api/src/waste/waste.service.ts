import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import Decimal from "decimal.js";
import { createHash } from "node:crypto";
import { AccessService } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import {
  batches,
  businesses,
  inventory,
  movements,
  products,
  wasteRecords,
} from "../database/schema";
import { InventoryService } from "../inventory/inventory.service";
import { WasteDto } from "../inventory/inventory.dto";

@Injectable()
export class WasteService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
    private readonly stock: InventoryService,
  ) {}
  async record(userId: string, businessId: string, dto: WasteDto) {
    await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "STAFF"],
      dto.locationId,
    );
    if (dto.reason === "other" && !dto.notes?.trim())
      throw new BadRequestException("Other requires notes");
    const requestHash = createHash("sha256")
      .update(JSON.stringify(dto))
      .digest("hex");
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(wasteRecords)
        .where(
          and(
            eq(wasteRecords.businessId, businessId),
            eq(wasteRecords.operationKey, dto.operationKey),
          ),
        );
      if (existing) {
        if (existing.requestHash !== requestHash)
          throw new ConflictException("Operation key reused");
        return existing;
      }
      const [initial] = await tx
        .select()
        .from(batches)
        .where(
          and(eq(batches.businessId, businessId), eq(batches.id, dto.batchId)),
        );
      if (!initial) throw new NotFoundException();
      const [position] = await tx
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.businessId, businessId),
            eq(inventory.id, initial.inventoryId),
          ),
        )
        .for("update");
      if (!position || position.locationId !== dto.locationId)
        throw new NotFoundException();
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, dto.batchId))
        .for("update");
      const [product] = await tx
        .select()
        .from(products)
        .where(
          and(
            eq(products.businessId, businessId),
            eq(products.id, batch.productId),
          ),
        );
      const count = this.stock.quantity(
        this.stock.positive(dto.quantity),
        product.baseUnit,
      );
      if (new Decimal(batch.remaining).lt(count))
        throw new ConflictException("Insufficient stock");
      const [business] = await tx
        .select()
        .from(businesses)
        .where(eq(businesses.id, businessId));
      const totalCost = new Decimal(count)
        .mul(batch.unitCost)
        .toDecimalPlaces(
          new Intl.NumberFormat("en", {
            style: "currency",
            currency: business.currency,
          }).resolvedOptions().maximumFractionDigits ?? 2,
          Decimal.ROUND_HALF_UP,
        )
        .toFixed(6);
      const [record] = await tx
        .insert(wasteRecords)
        .values({
          businessId,
          locationId: dto.locationId,
          batchId: batch.id,
          productId: batch.productId,
          origin: "STOCK",
          quantity: count,
          unitCost: batch.unitCost,
          totalCost,
          reason: dto.reason,
          notes: dto.notes,
          actorUserId: userId,
          operationKey: dto.operationKey,
          requestHash,
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
        .where(eq(inventory.id, position.id));
      await tx.insert(movements).values({
        businessId,
        inventoryId: position.id,
        batchId: batch.id,
        type: "WASTE",
        delta: new Decimal(count).neg().toFixed(6),
        unitCost: batch.unitCost,
        actorUserId: userId,
        wasteRecordId: record.id,
        operationKey: dto.operationKey,
        movementKey: `${dto.operationKey}:waste`,
        reason: dto.reason,
      });
      return record;
    });
  }
  async list(userId: string, businessId: string, locationId?: string) {
    const scope = await this.access.require(
      userId,
      businessId,
      ["OWNER", "ADMIN", "VIEWER"],
      locationId,
    );
    if (scope.locations !== "all" && !scope.locations.length) return [];
    const condition =
      scope.locations === "all"
        ? locationId
          ? and(
              eq(wasteRecords.businessId, businessId),
              eq(wasteRecords.locationId, locationId),
            )
          : eq(wasteRecords.businessId, businessId)
        : and(
            eq(wasteRecords.businessId, businessId),
            inArray(wasteRecords.locationId, scope.locations),
          );
    return this.database.db
      .select()
      .from(wasteRecords)
      .where(condition)
      .limit(100);
  }
}
