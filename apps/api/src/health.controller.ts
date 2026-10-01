import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { sql } from "drizzle-orm";
import { DatabaseService } from "./database/database.service";
import { Public } from "./common/public.decorator";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Public() @Get("live") live() {
    return { status: "ok" };
  }
  @Public() @Get("ready") async ready() {
    try {
      await this.database.db.execute(sql`select 1`);
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}
