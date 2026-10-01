import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export function authConfig() {
  const secret = env("JWT_SECRET");
  if (Buffer.byteLength(secret) < 32)
    throw new Error("JWT_SECRET must contain at least 32 bytes");
  return {
    secret,
    issuer: process.env.JWT_ISSUER ?? "food-intelligence-platform",
    audience: process.env.JWT_AUDIENCE ?? "food-intelligence-api",
    origin: process.env.APP_ORIGIN ?? "http://localhost:3000",
    cookieSecure: process.env.COOKIE_SECURE !== "false",
  };
}
