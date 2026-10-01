import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { WasteDto } from "../inventory/inventory.dto";
import { WasteService } from "./waste.service";
@ApiBearerAuth()
@ApiTags("waste")
@Controller("api/v1/businesses/:businessId/waste")
export class WasteController {
  constructor(private readonly service: WasteService) {}
  @Post() record(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: WasteDto,
  ) {
    return this.service.record(r.principal.userId, b, d);
  }
  @Get() list(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Query("locationId") loc?: string,
  ) {
    return this.service.list(r.principal.userId, b, loc);
  }
}
