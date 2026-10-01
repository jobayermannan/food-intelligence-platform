import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseService } from "../database/database.service";
import { AccessService } from "./access.service";
import { AuthGuard } from "./auth.guard";

@Global()
@Module({
  providers: [
    DatabaseService,
    AccessService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [DatabaseService, AccessService],
})
export class CoreModule {}
