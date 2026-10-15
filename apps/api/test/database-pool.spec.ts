jest.mock("@vercel/functions", () => ({
  attachDatabasePool: jest.fn(),
}));

import { attachDatabasePool } from "@vercel/functions";
import {
  attachPoolForVercel,
  databasePoolMax,
  databasePoolOptions,
} from "../src/database/pool";

const pool = { options: {}, on: jest.fn() } as never;

describe("database pool configuration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses a small pool and short idle timeout for Vercel Functions", () => {
    const environment = { VERCEL: "1" };
    expect(databasePoolOptions("postgresql://example", environment)).toEqual({
      connectionString: "postgresql://example",
      max: 4,
      idleTimeoutMillis: 5_000,
    });

    attachPoolForVercel(pool, environment);
    expect(attachDatabasePool).toHaveBeenCalledWith(pool);
  });

  it("keeps the server default outside Vercel", () => {
    expect(databasePoolOptions("postgresql://example", {})).toEqual({
      connectionString: "postgresql://example",
      max: 12,
    });
    attachPoolForVercel(pool, {});
    expect(attachDatabasePool).not.toHaveBeenCalled();
  });

  it("allows an explicit pool size in every environment", () => {
    expect(databasePoolMax({ DATABASE_POOL_MAX: "7" })).toBe(7);
    expect(databasePoolMax({ VERCEL: "1", DATABASE_POOL_MAX: "6" })).toBe(6);
  });

  it("rejects invalid pool sizes", () => {
    expect(() => databasePoolMax({ DATABASE_POOL_MAX: "0" })).toThrow(
      "DATABASE_POOL_MAX must be an integer between 1 and 50",
    );
  });
});
