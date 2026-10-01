import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { createApp } from "../src/main";
import { DatabaseService } from "../src/database/database.service";
import {
  allocations,
  batches,
  inventory,
  memberships,
  orders,
  saleItems,
  users,
} from "../src/database/schema";

const mockMailTexts: string[] = [];
jest.mock("nodemailer", () => ({
  __esModule: true,
  default: {
    createTransport: () => ({
      sendMail: async (message: { text: string }) => {
        mockMailTexts.push(message.text);
      },
    }),
  },
}));

describe("Backend 2.0 MVP against PostgreSQL", () => {
  let app: INestApplication;
  let database: DatabaseService;
  const password = "StrongTestPassword!2026";
  const base = "/api/v1";
  const tokenFromMail = () => {
    const match = /token: ([A-Za-z0-9_-]+)/.exec(mockMailTexts.at(-1) ?? "");
    if (!match) throw new Error("Expected test verification email");
    return match[1];
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  const register = async (email: string) => {
    const response = await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({ email, password, displayName: email })
      .expect(202);
    expect(response.body).toEqual({
      message: "If eligible, verification instructions were sent",
    });
    await request(app.getHttpServer())
      .post(`${base}/auth/verify-email`)
      .send({ token: tokenFromMail() })
      .expect(204);
    const login = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email, password })
      .expect(200);
    return {
      access: login.body.accessToken as string,
      cookie: login.headers["set-cookie"][0] as string,
    };
  };

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("_test"))
      throw new Error("Integration tests require an isolated _test database");
    process.env.JWT_SECRET = "integration-test-secret-longer-than-32-bytes";
    process.env.COOKIE_SECURE = "false";
    process.env.APP_ORIGIN = "http://localhost:3000";
    app = await createApp();
    await app.init();
    database = app.get(DatabaseService);
    await database.pool.query("TRUNCATE TABLE users CASCADE");
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it("verifies email, hashes passwords, rotates refresh tokens, detects replay and revokes the family", async () => {
    await request(app.getHttpServer()).get("/api/docs").expect(200);
    await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    await request(app.getHttpServer()).get("/health/live").expect(200);
    await request(app.getHttpServer()).get("/health/ready").expect(200);
    const first = await register("auth-test@example.test");
    const [stored] = await database.db
      .select()
      .from(users)
      .where(eq(users.email, "auth-test@example.test"));
    expect(stored.passwordHash).not.toContain(password);
    const mailCount = mockMailTexts.length;
    await request(app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({
        email: "auth-test@example.test",
        password,
        displayName: "Duplicate",
      })
      .expect(202);
    expect(mockMailTexts).toHaveLength(mailCount);
    await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: "auth-test@example.test", password: "incorrect" })
      .expect(401);
    const rotated = await request(app.getHttpServer())
      .post(`${base}/auth/refresh`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", first.cookie)
      .expect(200);
    const newCookie = rotated.headers["set-cookie"][0] as string;
    expect(newCookie).not.toEqual(first.cookie);
    await request(app.getHttpServer())
      .post(`${base}/auth/refresh`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", first.cookie)
      .expect(401);
    await request(app.getHttpServer())
      .get(`${base}/auth/me`)
      .set(bearer(rotated.body.accessToken as string))
      .expect(401);
    await request(app.getHttpServer())
      .post(`${base}/auth/refresh`)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", newCookie)
      .expect(401);
    const fresh = await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: "auth-test@example.test", password })
      .expect(200);
    await request(app.getHttpServer())
      .post(`${base}/auth/logout-all`)
      .set("Origin", "http://localhost:3000")
      .set(bearer(fresh.body.accessToken as string))
      .expect(204);
    await request(app.getHttpServer())
      .get(`${base}/auth/me`)
      .set(bearer(fresh.body.accessToken as string))
      .expect(401);
    await request(app.getHttpServer())
      .post(`${base}/auth/forgot-password`)
      .send({ email: "auth-test@example.test" })
      .expect(202);
    await request(app.getHttpServer())
      .post(`${base}/auth/reset-password`)
      .send({ token: tokenFromMail(), password: "NewStrongPassword!2026" })
      .expect(204);
    await request(app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: "auth-test@example.test", password })
      .expect(401);
  });

  it("isolates tenants and preserves stock through FEFO sales, returns, transfers and waste", async () => {
    const a = await register("owner-a@example.test");
    const b = await register("owner-b@example.test");
    const server = request(app.getHttpServer());
    const businessA = (
      await server
        .post(`${base}/businesses`)
        .set(bearer(a.access))
        .send({
          name: "A",
          timezone: "Asia/Dhaka",
          currency: "USD",
          defaultTaxRate: 0.1,
          requestKey: "business-a-2026",
        })
        .expect(201)
    ).body.id as string;
    const businessB = (
      await server
        .post(`${base}/businesses`)
        .set(bearer(b.access))
        .send({
          name: "B",
          timezone: "Asia/Dhaka",
          currency: "USD",
          defaultTaxRate: 0,
          requestKey: "business-b-2026",
        })
        .expect(201)
    ).body.id as string;
    await server
      .get(`${base}/businesses/${businessB}/locations`)
      .set(bearer(a.access))
      .expect(404);
    const loc1 = (
      await server
        .post(`${base}/businesses/${businessA}/locations`)
        .set(bearer(a.access))
        .send({ code: "FIRST", name: "First" })
        .expect(201)
    ).body.id as string;
    const loc2 = (
      await server
        .post(`${base}/businesses/${businessA}/locations`)
        .set(bearer(a.access))
        .send({ code: "SECOND", name: "Second" })
        .expect(201)
    ).body.id as string;
    const cat = (
      await server
        .post(`${base}/businesses/${businessA}/categories`)
        .set(bearer(a.access))
        .send({ name: "Food" })
        .expect(201)
    ).body.id as string;
    const product = (
      await server
        .post(`${base}/businesses/${businessA}/products`)
        .set(bearer(a.access))
        .send({
          categoryId: cat,
          sku: "SKU-1",
          name: "Milk",
          baseUnit: "piece",
          sellingPrice: "10.00",
        })
        .expect(201)
    ).body.id as string;
    const supplier = (
      await server
        .post(`${base}/businesses/${businessA}/suppliers`)
        .set(bearer(a.access))
        .send({ name: "Local Farm", reference: "LF-1" })
        .expect(201)
    ).body.id as string;
    await server
      .patch(`${base}/businesses/${businessA}/suppliers/${supplier}`)
      .set(bearer(a.access))
      .send({ name: "Local Farm Updated" })
      .expect(200);
    expect(
      (
        await server
          .get(`${base}/businesses/${businessA}/suppliers/${supplier}`)
          .set(bearer(a.access))
          .expect(200)
      ).body.name,
    ).toBe("Local Farm Updated");
    const stockUrl = `${base}/businesses/${businessA}/inventory`;
    const receive = async (key: string, date: string) =>
      (
        await server
          .post(`${stockUrl}/purchases`)
          .set(bearer(a.access))
          .send({
            locationId: loc1,
            productId: product,
            supplierId: supplier,
            quantity: "4",
            unit: "piece",
            acquisitionTotal: "20",
            expiryStatus: "known",
            expiresOn: date,
            operationKey: key,
          })
          .expect(201)
      ).body.id as string;
    const late = await receive("receive-late-2026", "2027-12-31");
    const early = await receive("receive-early-2026", "2027-01-01");
    const order = (
      await server
        .post(`${base}/businesses/${businessA}/orders`)
        .set(bearer(a.access))
        .send({
          locationId: loc1,
          lines: [{ productId: product, quantity: "6" }],
          requestKey: "sale-2026-0001",
        })
        .expect(201)
    ).body as { id: string; totalAmount: string; taxAmount: string };
    expect(order.totalAmount).toBe("66.000000");
    expect(order.taxAmount).toBe("6.000000");
    const [item] = await database.db
      .select()
      .from(saleItems)
      .where(eq(saleItems.orderId, order.id));
    const assigned = await database.db
      .select()
      .from(allocations)
      .where(eq(allocations.saleItemId, item.id));
    expect(assigned).toHaveLength(2);
    expect(assigned.find((row) => row.batchId === early)?.quantity).toBe(
      "4.000000",
    );
    expect(assigned.find((row) => row.batchId === late)?.quantity).toBe(
      "2.000000",
    );
    await server
      .post(`${base}/businesses/${businessA}/orders`)
      .set(bearer(a.access))
      .send({
        locationId: loc1,
        lines: [{ productId: product, quantity: "3" }],
        requestKey: "sale-2026-0002",
      })
      .expect(409);
    const positionBefore = await database.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, product));
    expect(positionBefore[0].onHand).toBe("2.000000");
    const returned = await server
      .post(`${base}/businesses/${businessA}/orders/${order.id}/returns`)
      .set(bearer(a.access))
      .send({
        reason: "Customer returned sealed stock",
        lines: [
          {
            allocationId: assigned[0].id,
            quantity: "1",
            restocked: "1",
            disposed: "0",
          },
        ],
        requestKey: "return-2026-0001",
      })
      .expect(201);
    expect(returned.body.totalAmount).toBe("11.000000");
    await server
      .post(`${base}/businesses/${businessA}/orders/${order.id}/returns`)
      .set(bearer(a.access))
      .send({
        reason: "Too much",
        lines: [
          {
            allocationId: assigned[0].id,
            quantity: "4",
            restocked: "4",
            disposed: "0",
          },
        ],
        requestKey: "return-2026-0002",
      })
      .expect(409);
    await server
      .post(`${stockUrl}/transfers`)
      .set(bearer(a.access))
      .send({
        sourceLocationId: loc1,
        destinationLocationId: loc2,
        batchId: late,
        quantity: "1",
        operationKey: "transfer-2026-0001",
      })
      .expect(201);
    await server
      .post(`${stockUrl}/transfers`)
      .set(bearer(a.access))
      .send({
        sourceLocationId: loc1,
        destinationLocationId: loc2,
        batchId: early,
        quantity: "100",
        operationKey: "transfer-2026-0002",
      })
      .expect(409);
    await server
      .post(`${base}/businesses/${businessA}/waste`)
      .set(bearer(a.access))
      .send({
        locationId: loc1,
        batchId: early,
        quantity: "1",
        reason: "spoiled",
        operationKey: "waste-2026-0001",
      })
      .expect(201);
    const [earlyAfter] = await database.db
      .select()
      .from(batches)
      .where(eq(batches.id, early));
    expect(earlyAfter.remaining).toBe("0.000000");
    const dateParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
        .formatToParts(new Date())
        .map((part) => [part.type, part.value]),
    );
    const today = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
    const near = (
      await server
        .post(`${stockUrl}/purchases`)
        .set(bearer(a.access))
        .send({
          locationId: loc1,
          productId: product,
          quantity: "5",
          unit: "piece",
          acquisitionTotal: "20",
          expiryStatus: "known",
          expiresOn: today,
          operationKey: "receive-near-2026",
        })
        .expect(201)
    ).body.id as string;
    const expiry = (
      await server
        .get(
          `${base}/businesses/${businessA}/inventory/expiry?locationId=${loc1}`,
        )
        .set(bearer(a.access))
        .expect(200)
    ).body as {
      batch: { id: string; expiresAt: string };
      classification: string;
      valueAtRisk: string;
    }[];
    expect(expiry.find((row) => row.batch.id === near)?.classification).toBe(
      "CRITICAL",
    );
    expect(expiry.find((row) => row.batch.id === near)?.valueAtRisk).toBe(
      "20.000000",
    );
    expect(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Dhaka",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(
        new Date(expiry.find((row) => row.batch.id === near)!.batch.expiresAt),
      ),
    ).toBe("00:00");
    const beforeRecommendation = (
      await database.db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, product))
    ).find((row) => row.locationId === loc1)!.onHand;
    const suggestion = (
      await server
        .post(`${base}/businesses/${businessA}/discount-recommendations`)
        .set(bearer(a.access))
        .send({ productId: product, locationId: loc1 })
        .expect(201)
    ).body;
    expect(suggestion.label).toBe("Baseline recommendation");
    expect(suggestion.recommendedPercent).toBe(30);
    expect(
      (
        await database.db
          .select()
          .from(inventory)
          .where(eq(inventory.productId, product))
      ).find((row) => row.locationId === loc1)!.onHand,
    ).toBe(beforeRecommendation);
    const approved = await server
      .post(`${base}/businesses/${businessA}/discounts`)
      .set(bearer(a.access))
      .send({
        productId: product,
        batchId: near,
        percent: "30",
        validFrom: new Date(Date.now() - 1000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        explanation: "Expiry approved",
      })
      .expect(201);
    const discountedOrder = await server
      .post(`${base}/businesses/${businessA}/orders`)
      .set(bearer(a.access))
      .send({
        locationId: loc1,
        lines: [
          { productId: product, quantity: "1", discountId: approved.body.id },
        ],
        requestKey: "discounted-sale-2026",
      })
      .expect(201);
    expect(discountedOrder.body.totalAmount).toBe("7.700000");
    const [discountedItem] = await database.db
      .select()
      .from(saleItems)
      .where(eq(saleItems.orderId, discountedOrder.body.id as string));
    expect(discountedItem.discountAmount).toBe("3.000000");
    expect(discountedItem.taxAmount).toBe("0.700000");
    const [discountedAllocation] = await database.db
      .select()
      .from(allocations)
      .where(eq(allocations.saleItemId, discountedItem.id));
    const stockAfterSale = (
      await database.db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, product))
    ).find((row) => row.locationId === loc1)!.onHand;
    const discountedReturn = await server
      .post(
        `${base}/businesses/${businessA}/orders/${discountedOrder.body.id}/returns`,
      )
      .set(bearer(a.access))
      .send({
        reason: "Unsaleable customer return",
        lines: [
          {
            allocationId: discountedAllocation.id,
            quantity: "1",
            restocked: "0",
            disposed: "1",
          },
        ],
        requestKey: "discounted-return-2026",
      })
      .expect(201);
    expect(discountedReturn.body.totalAmount).toBe("7.700000");
    expect(
      (
        await database.db
          .select()
          .from(inventory)
          .where(eq(inventory.productId, product))
      ).find((row) => row.locationId === loc1)!.onHand,
    ).toBe(stockAfterSale);
    await server
      .get(
        `${base}/businesses/${businessA}/analytics/products?locationId=${loc1}`,
      )
      .set(bearer(a.access))
      .expect(200);
    await server
      .get(`${base}/businesses/${businessA}/analytics/waste?locationId=${loc1}`)
      .set(bearer(a.access))
      .expect(200);
    await server
      .post(`${stockUrl}/purchases`)
      .set(bearer(a.access))
      .send({
        locationId: loc1,
        productId: product,
        quantity: "1",
        unit: "piece",
        acquisitionTotal: "12",
        expiryStatus: "unknown",
        operationKey: "receive-highcost-2026",
      })
      .expect(201);
    await server
      .post(`${base}/businesses/${businessA}/discounts`)
      .set(bearer(a.access))
      .send({
        productId: product,
        percent: "10",
        validFrom: new Date(Date.now() - 1000).toISOString(),
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        explanation: "Below cost blocked",
      })
      .expect(400);
    await server
      .post(`${base}/businesses/${businessB}/waste`)
      .set(bearer(a.access))
      .send({
        locationId: loc1,
        batchId: early,
        quantity: "1",
        reason: "spoiled",
        operationKey: "cross-tenant-0001",
      })
      .expect(404);
    expect(
      await database.db.select().from(orders).where(eq(orders.id, order.id)),
    ).toHaveLength(1);
    expect(
      await database.db
        .select()
        .from(memberships)
        .where(eq(memberships.businessId, businessA)),
    ).toHaveLength(1);
    const bLocation = (
      await server
        .post(`${base}/businesses/${businessB}/locations`)
        .set(bearer(b.access))
        .send({ code: "B-MAIN", name: "B Main" })
        .expect(201)
    ).body.id as string;
    const [aUser] = await database.db
      .select()
      .from(users)
      .where(eq(users.email, "owner-a@example.test"));
    const aMembership = (
      await server
        .post(`${base}/businesses/${businessB}/members`)
        .set(bearer(b.access))
        .send({ userId: aUser.id, role: "VIEWER" })
        .expect(201)
    ).body.id as string;
    await server
      .put(`${base}/businesses/${businessB}/members/${aMembership}/locations`)
      .set(bearer(b.access))
      .send({ locationIds: [bLocation] })
      .expect(200);
    expect(
      (await server.get(`${base}/businesses`).set(bearer(a.access)).expect(200))
        .body,
    ).toHaveLength(2);
    await server
      .get(`${base}/businesses/${businessB}/locations`)
      .set(bearer(a.access))
      .expect(200);
  });

  it("enforces role, location, last-owner and immediate revocation rules", async () => {
    const owner = await register("roles-owner@example.test");
    const staff = await register("roles-staff@example.test");
    const viewer = await register("roles-viewer@example.test");
    const server = request(app.getHttpServer());
    const businessId = (
      await server
        .post(`${base}/businesses`)
        .set(bearer(owner.access))
        .send({
          name: "Roles",
          timezone: "Asia/Dhaka",
          currency: "USD",
          defaultTaxRate: 0,
          requestKey: "roles-business-2026",
        })
        .expect(201)
    ).body.id as string;
    const locationA = (
      await server
        .post(`${base}/businesses/${businessId}/locations`)
        .set(bearer(owner.access))
        .send({ code: "A", name: "A" })
        .expect(201)
    ).body.id as string;
    const locationB = (
      await server
        .post(`${base}/businesses/${businessId}/locations`)
        .set(bearer(owner.access))
        .send({ code: "B", name: "B" })
        .expect(201)
    ).body.id as string;
    const [staffUser] = await database.db
      .select()
      .from(users)
      .where(eq(users.email, "roles-staff@example.test"));
    const [viewerUser] = await database.db
      .select()
      .from(users)
      .where(eq(users.email, "roles-viewer@example.test"));
    const staffMembership = (
      await server
        .post(`${base}/businesses/${businessId}/members`)
        .set(bearer(owner.access))
        .send({ userId: staffUser.id, role: "STAFF" })
        .expect(201)
    ).body.id as string;
    const viewerMembership = (
      await server
        .post(`${base}/businesses/${businessId}/members`)
        .set(bearer(owner.access))
        .send({ userId: viewerUser.id, role: "VIEWER" })
        .expect(201)
    ).body.id as string;
    await server
      .put(
        `${base}/businesses/${businessId}/members/${staffMembership}/locations`,
      )
      .set(bearer(owner.access))
      .send({ locationIds: [locationA] })
      .expect(200);
    await server
      .put(
        `${base}/businesses/${businessId}/members/${viewerMembership}/locations`,
      )
      .set(bearer(owner.access))
      .send({ locationIds: [locationB] })
      .expect(200);
    expect(
      (
        await server
          .get(`${base}/businesses/${businessId}/locations`)
          .set(bearer(staff.access))
          .expect(200)
      ).body,
    ).toHaveLength(1);
    await server
      .get(
        `${base}/businesses/${businessId}/inventory/batches?locationId=${locationB}`,
      )
      .set(bearer(staff.access))
      .expect(404);
    await server
      .post(`${base}/businesses/${businessId}/locations`)
      .set(bearer(staff.access))
      .send({ code: "C", name: "C" })
      .expect(403);
    await server
      .post(`${base}/businesses/${businessId}/members`)
      .set(bearer(staff.access))
      .send({ userId: viewerUser.id, role: "OWNER" })
      .expect(403);
    await server
      .get(`${base}/businesses/${businessId}/analytics/inventory`)
      .set(bearer(viewer.access))
      .expect(200);
    await server
      .post(`${base}/businesses/${businessId}/waste`)
      .set(bearer(viewer.access))
      .send({
        locationId: locationB,
        batchId: locationA,
        quantity: "1",
        reason: "expired",
        operationKey: "viewer-waste-2026",
      })
      .expect(403);
    const members = (
      await server
        .get(`${base}/businesses/${businessId}/members`)
        .set(bearer(owner.access))
        .expect(200)
    ).body as { id: string; role: string }[];
    const ownerMembership = members.find((m) => m.role === "OWNER")!.id;
    await server
      .delete(`${base}/businesses/${businessId}/members/${ownerMembership}`)
      .set(bearer(owner.access))
      .send({ password })
      .expect(409);
    await server
      .delete(`${base}/businesses/${businessId}/members/${staffMembership}`)
      .set(bearer(owner.access))
      .send({})
      .expect(204);
    await server
      .get(`${base}/businesses/${businessId}/locations`)
      .set(bearer(staff.access))
      .expect(404);
    const audit = await server
      .get(`${base}/businesses/${businessId}/audit-events`)
      .set(bearer(owner.access))
      .expect(200);
    expect(
      (audit.body as { action: string }[]).map((event) => event.action),
    ).toContain("MEMBER_REVOKED");
    expect(JSON.stringify(audit.body)).not.toContain(password);
    await server
      .get(`${base}/businesses/${businessId}/audit-events`)
      .set(bearer(viewer.access))
      .expect(403);
  });

  it("serializes concurrent sales and treats DST expiry dates as local calendar dates", async () => {
    const owner = await register("concurrency-owner@example.test");
    const server = request(app.getHttpServer());
    const businessId = (
      await server
        .post(`${base}/businesses`)
        .set(bearer(owner.access))
        .send({
          name: "Concurrency",
          timezone: "America/New_York",
          currency: "USD",
          defaultTaxRate: 0,
          requestKey: "concurrent-business-2026",
        })
        .expect(201)
    ).body.id as string;
    const locationId = (
      await server
        .post(`${base}/businesses/${businessId}/locations`)
        .set(bearer(owner.access))
        .send({ code: "MAIN", name: "Main" })
        .expect(201)
    ).body.id as string;
    const categoryId = (
      await server
        .post(`${base}/businesses/${businessId}/categories`)
        .set(bearer(owner.access))
        .send({ name: "Food" })
        .expect(201)
    ).body.id as string;
    const productId = (
      await server
        .post(`${base}/businesses/${businessId}/products`)
        .set(bearer(owner.access))
        .send({
          categoryId,
          sku: "CONCURRENT",
          name: "Pack",
          baseUnit: "piece",
          sellingPrice: "2.00",
        })
        .expect(201)
    ).body.id as string;
    await server
      .post(`${base}/businesses/${businessId}/inventory/purchases`)
      .set(bearer(owner.access))
      .send({
        locationId,
        productId,
        quantity: "5",
        unit: "piece",
        acquisitionTotal: "5",
        expiryStatus: "nonperishable",
        operationKey: "concurrent-receipt-2026",
      })
      .expect(201);
    const orderUrl = `${base}/businesses/${businessId}/orders`;
    const results = await Promise.all(
      ["concurrent-sale-a", "concurrent-sale-b"].map((requestKey) =>
        server
          .post(orderUrl)
          .set(bearer(owner.access))
          .send({
            locationId,
            lines: [{ productId, quantity: "4" }],
            requestKey,
          }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const [position] = await database.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId));
    expect(position.onHand).toBe("1.000000");
    const historic = await server
      .post(`${base}/businesses/${businessId}/inventory/purchases`)
      .set(bearer(owner.access))
      .send({
        locationId,
        productId,
        quantity: "1",
        unit: "piece",
        acquisitionTotal: "1",
        expiryStatus: "known",
        expiresOn: "2026-03-08",
        operationKey: "dst-receipt-2026",
      })
      .expect(201);
    expect(historic.body.expiresAt).toBe("2026-03-09T04:00:00.000Z");
  });
});
