import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";
@Module({
  imports: [InventoryModule],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
