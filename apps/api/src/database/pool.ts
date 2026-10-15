import { attachDatabasePool } from "@vercel/functions";
import type { Pool, PoolConfig } from "pg";

const defaultServerPoolMax = 12;
const defaultVercelPoolMax = 4;
const vercelIdleTimeoutMillis = 5_000;

export function databasePoolMax(environment = process.env) {
  const configured = environment.DATABASE_POOL_MAX?.trim();
  if (!configured)
    return environment.VERCEL === "1"
      ? defaultVercelPoolMax
      : defaultServerPoolMax;

  const max = Number(configured);
  if (!Number.isInteger(max) || max < 1 || max > 50)
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 50");
  return max;
}

export function databasePoolOptions(
  connectionString: string,
  environment = process.env,
): PoolConfig {
  return {
    connectionString,
    max: databasePoolMax(environment),
    ...(environment.VERCEL === "1"
      ? { idleTimeoutMillis: vercelIdleTimeoutMillis }
      : {}),
  };
}

export function attachPoolForVercel(pool: Pool, environment = process.env) {
  if (environment.VERCEL === "1") attachDatabasePool(pool);
}
