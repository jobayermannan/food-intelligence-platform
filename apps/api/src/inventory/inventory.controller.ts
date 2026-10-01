import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { InventoryService } from "./inventory.service";
import { AdjustDto, ReceiveDto, TransferDto } from "./inventory.dto";

@ApiBearerAuth()
@ApiTags("inventory")
@Controller("api/v1/businesses/:businessId/inventory")
export class InventoryController {
  constructor(private readonly service: InventoryService) {}
  @Post("purchases") receive(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: ReceiveDto,
  ) {
    return this.service.receive(r.principal.userId, b, d);
  }
  @Post("transfers") transfer(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: TransferDto,
  ) {
    return this.service.transfer(r.principal.userId, b, d);
  }
  @Post("adjustments") adjust(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: AdjustDto,
  ) {
    return this.service.adjust(r.principal.userId, b, d);
  }
  @Get("positions") positions(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.positions(r.principal.userId, b);
  }
  @Get("batches") batches(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Query("locationId") id: string,
  ) {
    return this.service.listBatches(r.principal.userId, b, id);
  }
  @Get("movements") movements(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Query("locationId") id: string,
  ) {
    return this.service.listMovements(r.principal.userId, b, id);
  }
}
