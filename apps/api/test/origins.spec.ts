import "reflect-metadata";
import { INestApplication, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import request from "supertest";
import cookieParser from "cookie-parser";
import { AuthController } from "../src/auth/auth.controller";
import { AuthService } from "../src/auth/auth.service";
import { authConfig } from "../src/config";
import { appOrigins, isAllowedOrigin } from "../src/origins";

const auth = {
  refresh: jest
    .fn()
    .mockResolvedValue({ accessToken: "access", refreshToken: "rotated" }),
  logout: jest.fn(),
  logoutAll: jest.fn(),
};
@Module({
  controllers: [AuthController],
  providers: [{ provide: AuthService, useValue: auth }],
})
class OriginTestModule {}

describe("exact-origin policy (no database)", () => {
  const saved = { ...process.env };
  const allowed = ["http://localhost:3001", "http://192.168.0.103:3001"];
  let app: INestApplication;

  beforeEach(() => {
    process.env.APP_ORIGINS = allowed.join(",");
    process.env.APP_ORIGIN = "https://production.example";
    process.env.JWT_SECRET = "origin-test-secret-at-least-32-bytes";
    process.env.COOKIE_SECURE = "false";
    jest.clearAllMocks();
  });
  afterEach(async () => {
    if (app) await app.close();
  });
  afterAll(() => {
    process.env = saved;
  });

  it("uses explicit origins and retains single-origin production configuration", () => {
    expect(appOrigins()).toEqual(allowed);
    for (const origin of allowed) expect(isAllowedOrigin(origin)).toBe(true);
    for (const origin of [
      undefined,
      "null",
      "https://evil.example",
      "http://localhost:3001.evil.example",
      "http://localhost:3002",
    ])
      expect(isAllowedOrigin(origin)).toBe(false);
    delete process.env.APP_ORIGINS;
    expect(appOrigins()).toEqual(["https://production.example"]);
    expect(isAllowedOrigin(allowed[0])).toBe(false);
  });

  it.each([
    "*",
    "https://*.example",
    "https://example/path",
    "https://example/",
    "https://user:pass@example",
    "null",
    "http://localhost:3001,",
  ])("rejects invalid configured origin %s", (value) => {
    process.env.APP_ORIGINS = value;
    expect(appOrigins).toThrow();
  });

  it("allows both origins through CORS and refresh and preserves cookie attributes", async () => {
    app = await NestFactory.create(OriginTestModule, { logger: false });
    app.use(cookieParser());
    app.enableCors({ origin: authConfig().origins, credentials: true });
    await app.init();
    for (const origin of allowed) {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .set("Origin", origin)
        .set("Cookie", "refresh_token=test")
        .expect(200);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      const cookie = response.headers["set-cookie"][0];
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/api/v1/auth");
      expect(cookie).not.toMatch(/; (Secure|Domain=)/);
    }
    auth.refresh.mockClear();
    for (const endpoint of ["refresh", "logout", "logout-all"]) {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/auth/${endpoint}`)
        .set("Origin", "https://evil.example")
        .set("Cookie", "refresh_token=test")
        .expect(401);
      expect(response.body.message).toBe("Origin required");
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    }
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").expect(401);
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(auth.logoutAll).not.toHaveBeenCalled();
  });
});
