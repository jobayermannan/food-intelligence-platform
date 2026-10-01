import { Module } from "@nestjs/common";
import { CoreModule } from "./common/core.module";
import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { BusinessModule } from "./business/business.module";
import { CatalogModule } from "./catalog/catalog.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SalesModule } from "./sales/sales.module";
import { WasteModule } from "./waste/waste.module";
import { InsightsModule } from "./insights/insights.module";

@Module({
  imports: [
    CoreModule,
    AuthModule,
    BusinessModule,
    CatalogModule,
    InventoryModule,
    SalesModule,
    WasteModule,
    InsightsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
