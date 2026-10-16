import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { createApp } from "../src/main";
import { DatabaseService } from "../src/database/database.service";
import {
  businesses,
  inventory,
  locations,
  orders,
  products,
  users,
} from "../src/database/schema";
import { demoEmail } from "../src/demo/demo.service";

describe("Recruiter demo workspace against PostgreSQL", () => {
  let app: INestApplication;
  let database: DatabaseService;
  const base = "/api/v1";
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("_test"))
      throw new Error("Integration tests require an isolated _test database");
    process.env.JWT_SECRET = "integration-test-secret-longer-than-32-bytes";
    process.env.COOKIE_SECURE = "false";
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.APP_ORIGINS = "http://localhost:3000";
    app = await createApp();
    await app.init();
    database = app.get(DatabaseService);
    await database.pool.query("TRUNCATE TABLE users CASCADE");
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("creates an idempotent, scoped demo session and permits normal operations", async () => {
    const server = request(app.getHttpServer());
    const [first, second] = await Promise.all([
      server.post(`${base}/demo/session`).expect(200),
      server.post(`${base}/demo/session`).expect(200),
    ]);
    expect(first.body.accessToken).toEqual(expect.any(String));
    expect(first.headers["set-cookie"][0]).toContain("refresh_token=");

    await server
      .get(`${base}/auth/me`)
      .set(bearer(first.body.accessToken as string))
      .expect(200)
      .expect(({ body }) => {
        expect(body.email).toBe(demoEmail);
        expect(body.isDemo).toBe(true);
      });

    const workspaces = await server
      .get(`${base}/businesses`)
      .set(bearer(first.body.accessToken as string))
      .expect(200);
    expect(workspaces.body).toHaveLength(1);
    expect(workspaces.body[0].name).toBe("Green Spoon Demo Café");
    const businessId = workspaces.body[0].id as string;

    const locationResponse = await server
      .get(`${base}/businesses/${businessId}/locations`)
      .set(bearer(first.body.accessToken as string))
      .expect(200);
    expect(locationResponse.body).toHaveLength(2);
    const dhanmondi = locationResponse.body.find(
      (location: { code: string }) => location.code === "DHN-01",
    ) as { id: string };

    await server
      .get(`${base}/businesses/${businessId}/inventory/positions`)
      .set(bearer(first.body.accessToken as string))
      .expect(200);
    const [avocado] = await database.db
      .select({ productId: inventory.productId })
      .from(inventory)
      .innerJoin(products, eq(products.id, inventory.productId))
      .where(
        and(
          eq(inventory.locationId, dhanmondi.id),
          eq(products.sku, "DEMO-AVO"),
        ),
      );
    expect(avocado).toBeDefined();

    await server
      .post(`${base}/businesses/${businessId}/orders`)
      .set(bearer(first.body.accessToken as string))
      .send({
        locationId: dhanmondi.id,
        lines: [{ productId: avocado.productId, quantity: "2" }],
        requestKey: "demo-test-sale-001",
      })
      .expect(201);

    await server
      .post(`${base}/businesses`)
      .set(bearer(first.body.accessToken as string))
      .send({
        name: "Blocked Demo Business",
        timezone: "Asia/Dhaka",
        currency: "BDT",
        defaultTaxRate: 0,
        requestKey: "blocked-demo-business",
      })
      .expect(403);

    expect(second.body.accessToken).toEqual(expect.any(String));
    const [demoUser] = await database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, demoEmail));
    const demoBusinesses = await database.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.createdByUserId, demoUser.id));
    expect(demoBusinesses).toHaveLength(1);

    await server
      .post(`${base}/demo/reset`)
      .set(bearer(second.body.accessToken as string))
      .expect(200);

    const [resetBusiness] = demoBusinesses;
    const [orderCount, locationCount, positionCount] = await Promise.all([
      database.db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.businessId, resetBusiness.id)),
      database.db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.businessId, resetBusiness.id)),
      database.db
        .select({ id: inventory.id })
        .from(inventory)
        .where(eq(inventory.businessId, resetBusiness.id)),
    ]);
    expect(orderCount).toHaveLength(0);
    expect(locationCount).toHaveLength(2);
    expect(positionCount).toHaveLength(4);

    const [unrelated] = await database.db
      .insert(users)
      .values({
        email: "ordinary-user@example.test",
        displayName: "Ordinary user",
        passwordHash: "not-used-by-this-test",
        verifiedAt: new Date(),
      })
      .returning();
    const [ordinaryBusiness] = await database.db
      .insert(businesses)
      .values({
        name: "Ordinary Business",
        timezone: "Asia/Dhaka",
        currency: "BDT",
        createdByUserId: unrelated.id,
        creationKey: "ordinary-test-workspace",
        defaultTaxRate: "0",
      })
      .returning();
    await server
      .get(`${base}/businesses/${ordinaryBusiness.id}/locations`)
      .set(bearer(second.body.accessToken as string))
      .expect(404);

    const [persistedDemo] = await database.db
      .select({ id: businesses.id, isDemo: businesses.isDemo })
      .from(businesses)
      .where(
        and(eq(businesses.id, resetBusiness.id), eq(businesses.isDemo, true)),
      );
    expect(persistedDemo).toBeDefined();
  });
});
