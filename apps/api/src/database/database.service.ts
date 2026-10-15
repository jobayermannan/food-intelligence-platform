import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../config";
import { attachPoolForVercel, databasePoolOptions } from "./pool";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool = new Pool(databasePoolOptions(env("DATABASE_URL")));
  readonly db = drizzle(this.pool, { schema });

  constructor() {
    attachPoolForVercel(this.pool);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
