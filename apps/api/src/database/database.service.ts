import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { env } from "../config";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool = new Pool({ connectionString: env("DATABASE_URL"), max: 12 });
  readonly db = drizzle(this.pool, { schema });

  async onModuleDestroy() {
    await this.pool.end();
  }
}
