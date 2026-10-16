import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { and, eq, lt } from "drizzle-orm";
import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "../database/database.service";
import {
  allocations,
  batches,
  businesses,
  categories,
  discounts,
  inventory,
  locations,
  roles,
  memberships,
  movements,
  orders,
  products,
  returnItems,
  saleItems,
  saleReturns,
  sessions,
  suppliers,
  users,
  wasteRecords,
} from "../database/schema";

export const demoEmail = "recruiter-demo@food-intelligence.invalid";
const demoKey = "recruiter-demo-v1";
type Tx = Parameters<Parameters<DatabaseService["db"]["transaction"]>[0]>[0];

@Injectable()
export class DemoService {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(private readonly database: DatabaseService) {}

  private limit(ip: string) {
    const now = Date.now();
    const current = this.attempts.get(ip);
    if (!current || current.until < now) {
      this.attempts.set(ip, { count: 1, until: now + 15 * 60_000 });
      return;
    }
    if (current.count >= 12)
      throw new HttpException(
        "Please wait a few minutes before starting another demo session.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    current.count++;
  }

  async bootstrap(ip: string) {
    this.limit(ip);
    const user = await this.ensureDemo();
    await this.database.db
      .delete(sessions)
      .where(
        and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())),
      );
    return user;
  }

  async assertDemoUser(userId: string) {
    const [user] = await this.database.db
      .select({ id: users.id, isDemo: users.isDemo })
      .from(users)
      .where(eq(users.id, userId));
    if (!user?.isDemo) throw new ForbiddenException("Demo access required");
    return user;
  }

  private async ensureDemo() {
    let [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, demoEmail));
    if (user && !user.isDemo)
      throw new Error("The reserved demo identity is already in use.");
    if (!user) {
      const passwordHash = await argon2.hash(
        randomBytes(32).toString("base64url"),
      );
      const [created] = await this.database.db
        .insert(users)
        .values({
          email: demoEmail,
          displayName: "Demo Explorer",
          passwordHash,
          isDemo: true,
          verifiedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();
      user = created;
      if (!user)
        [user] = await this.database.db
          .select()
          .from(users)
          .where(eq(users.email, demoEmail));
    }
    let [business] = await this.database.db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.createdByUserId, user.id),
          eq(businesses.creationKey, demoKey),
        ),
      );
    if (business && !business.isDemo)
      throw new Error("The reserved demo workspace is already in use.");
    if (!business) {
      const [created] = await this.database.db
        .insert(businesses)
        .values({
          name: "Green Spoon Demo Café",
          timezone: "Asia/Dhaka",
          currency: "BDT",
          createdByUserId: user.id,
          creationKey: demoKey,
          defaultTaxRate: "0.050000",
          isDemo: true,
        })
        .onConflictDoNothing()
        .returning();
      business = created;
      if (!business)
        [business] = await this.database.db
          .select()
          .from(businesses)
          .where(
            and(
              eq(businesses.createdByUserId, user.id),
              eq(businesses.creationKey, demoKey),
            ),
          );
    }
    await this.database.db.transaction(async (tx) => {
      const [lockedBusiness] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, business.id))
        .for("update");
      if (!lockedBusiness) throw new Error("Demo workspace is unavailable.");
      const [owner] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.code, "OWNER"));
      if (!owner)
        throw new Error(
          "Standard roles are missing; run migrations before demo initialization.",
        );
      await tx
        .insert(memberships)
        .values({
          businessId: business.id,
          userId: user.id,
          roleId: owner.id,
          grantedByUserId: user.id,
        })
        .onConflictDoNothing();
      const [location] = await tx
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.businessId, lockedBusiness.id))
        .limit(1);
      if (!location) await this.seed(tx, lockedBusiness.id, user.id);
    });
    return user;
  }

  async reset(userId: string) {
    await this.assertDemoUser(userId);
    const [business] = await this.database.db
      .select()
      .from(businesses)
      .where(
        and(
          eq(businesses.createdByUserId, userId),
          eq(businesses.creationKey, demoKey),
          eq(businesses.isDemo, true),
        ),
      );
    if (!business)
      throw new ForbiddenException("Demo workspace is unavailable");
    await this.database.db.transaction(async (tx) => {
      const [lockedBusiness] = await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, business.id))
        .for("update");
      if (!lockedBusiness)
        throw new ForbiddenException("Demo workspace is unavailable");
      const condition = eq(movements.businessId, lockedBusiness.id);
      await tx.delete(movements).where(condition);
      await tx
        .delete(wasteRecords)
        .where(eq(wasteRecords.businessId, lockedBusiness.id));
      await tx
        .delete(returnItems)
        .where(eq(returnItems.businessId, lockedBusiness.id));
      await tx
        .delete(saleReturns)
        .where(eq(saleReturns.businessId, lockedBusiness.id));
      await tx
        .delete(allocations)
        .where(eq(allocations.businessId, lockedBusiness.id));
      await tx
        .delete(saleItems)
        .where(eq(saleItems.businessId, lockedBusiness.id));
      await tx.delete(orders).where(eq(orders.businessId, lockedBusiness.id));
      await tx
        .delete(discounts)
        .where(eq(discounts.businessId, lockedBusiness.id));
      await tx.delete(batches).where(eq(batches.businessId, lockedBusiness.id));
      await tx
        .delete(inventory)
        .where(eq(inventory.businessId, lockedBusiness.id));
      await tx
        .delete(products)
        .where(eq(products.businessId, lockedBusiness.id));
      await tx
        .delete(categories)
        .where(eq(categories.businessId, lockedBusiness.id));
      await tx
        .delete(suppliers)
        .where(eq(suppliers.businessId, lockedBusiness.id));
      await tx
        .delete(locations)
        .where(eq(locations.businessId, lockedBusiness.id));
      await this.seed(tx, lockedBusiness.id, userId);
    });
    return { message: "Demo workspace reset" };
  }

  private async seed(tx: Tx, businessId: string, userId: string) {
    const [dhanmondi, gulshan] = await tx
      .insert(locations)
      .values([
        { businessId, code: "DHN-01", name: "Dhanmondi Branch" },
        { businessId, code: "GLS-01", name: "Gulshan Branch" },
      ])
      .returning();
    const [produce, bakery] = await tx
      .insert(categories)
      .values([
        { businessId, name: "Fresh produce" },
        { businessId, name: "Bakery" },
      ])
      .returning();
    const [farm, bake] = await tx
      .insert(suppliers)
      .values([
        { businessId, name: "Meadow Farms", reference: "GS-100" },
        { businessId, name: "Artisan Bakehouse", reference: "GS-200" },
      ])
      .returning();
    const [avocado, spinach, brioche] = await tx
      .insert(products)
      .values([
        {
          businessId,
          categoryId: produce.id,
          sku: "DEMO-AVO",
          name: "Hass Avocado",
          baseUnit: "piece",
          sellingPrice: "180.000000",
        },
        {
          businessId,
          categoryId: produce.id,
          sku: "DEMO-SPN",
          name: "Baby Spinach",
          baseUnit: "kg",
          sellingPrice: "650.000000",
        },
        {
          businessId,
          categoryId: bakery.id,
          sku: "DEMO-BRI",
          name: "Brioche Bun",
          baseUnit: "piece",
          sellingPrice: "75.000000",
        },
      ])
      .returning();
    const positions = await tx
      .insert(inventory)
      .values([
        {
          businessId,
          locationId: dhanmondi.id,
          productId: avocado.id,
          onHand: "26.000000",
          reorderLevel: "8.000000",
        },
        {
          businessId,
          locationId: dhanmondi.id,
          productId: spinach.id,
          onHand: "4.500000",
          reorderLevel: "2.000000",
        },
        {
          businessId,
          locationId: dhanmondi.id,
          productId: brioche.id,
          onHand: "34.000000",
          reorderLevel: "12.000000",
        },
        {
          businessId,
          locationId: gulshan.id,
          productId: avocado.id,
          onHand: "14.000000",
          reorderLevel: "6.000000",
        },
      ])
      .returning();
    const now = Date.now();
    const date = (days: number) => new Date(now + days * 86400000);
    const [avoBatch, spinachBatch, briocheBatch, gulshanBatch] = await tx
      .insert(batches)
      .values([
        {
          businessId,
          inventoryId: positions[0].id,
          productId: avocado.id,
          supplierId: farm.id,
          lotReference: "AVO-DEMO-01",
          receivedAt: date(-2),
          expiresAt: date(2),
          expiryStatus: "known",
          unitCost: "96.000000",
          remaining: "26.000000",
        },
        {
          businessId,
          inventoryId: positions[1].id,
          productId: spinach.id,
          supplierId: farm.id,
          lotReference: "SPN-DEMO-01",
          receivedAt: date(-1),
          expiresAt: date(1),
          expiryStatus: "known",
          unitCost: "280.000000",
          remaining: "4.500000",
        },
        {
          businessId,
          inventoryId: positions[2].id,
          productId: brioche.id,
          supplierId: bake.id,
          lotReference: "BRI-DEMO-01",
          receivedAt: date(-1),
          expiresAt: date(4),
          expiryStatus: "known",
          unitCost: "31.000000",
          remaining: "34.000000",
        },
        {
          businessId,
          inventoryId: positions[3].id,
          productId: avocado.id,
          supplierId: farm.id,
          lotReference: "AVO-DEMO-02",
          receivedAt: date(-2),
          expiresAt: date(8),
          expiryStatus: "known",
          unitCost: "98.000000",
          remaining: "14.000000",
        },
      ])
      .returning();
    await tx.insert(movements).values([
      {
        businessId,
        inventoryId: positions[0].id,
        batchId: avoBatch.id,
        type: "PURCHASE",
        delta: "26.000000",
        unitCost: "96.000000",
        actorUserId: userId,
        operationKey: "demo-receive-avocado",
        movementKey: "demo-receive-avocado-1",
        provenanceReference: "Opening demo stock",
      },
      {
        businessId,
        inventoryId: positions[1].id,
        batchId: spinachBatch.id,
        type: "PURCHASE",
        delta: "4.500000",
        unitCost: "280.000000",
        actorUserId: userId,
        operationKey: "demo-receive-spinach",
        movementKey: "demo-receive-spinach-1",
        provenanceReference: "Opening demo stock",
      },
      {
        businessId,
        inventoryId: positions[2].id,
        batchId: briocheBatch.id,
        type: "PURCHASE",
        delta: "34.000000",
        unitCost: "31.000000",
        actorUserId: userId,
        operationKey: "demo-receive-brioche",
        movementKey: "demo-receive-brioche-1",
        provenanceReference: "Opening demo stock",
      },
      {
        businessId,
        inventoryId: positions[3].id,
        batchId: gulshanBatch.id,
        type: "PURCHASE",
        delta: "14.000000",
        unitCost: "98.000000",
        actorUserId: userId,
        operationKey: "demo-receive-gulshan",
        movementKey: "demo-receive-gulshan-1",
        provenanceReference: "Opening demo stock",
      },
    ]);
  }
}
