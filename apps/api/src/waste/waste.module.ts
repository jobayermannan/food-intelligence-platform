import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { WasteController } from "./waste.controller";
import { WasteService } from "./waste.service";
@Module({
  imports: [InventoryModule],
  providers: [WasteService],
  controllers: [WasteController],
})
export class WasteModule {}
