import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { SalesService } from "./sales.service";
import { CreateSaleDto, CreateReturnDto } from "./sales.dto";
@ApiBearerAuth()
@ApiTags("sales")
@Controller("api/v1/businesses/:businessId/orders")
export class SalesController {
  constructor(private readonly service: SalesService) {}
  @Post() create(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() d: CreateSaleDto,
  ) {
    return this.service.sell(r.principal.userId, b, d);
  }
  @Get() list(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Query("locationId") loc?: string,
  ) {
    return this.service.list(r.principal.userId, b, loc);
  }
  @Get(":id") detail(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
  ) {
    return this.service.detail(r.principal.userId, b, id);
  }
  @Post(":id/returns") addReturn(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("id") id: string,
    @Body() d: CreateReturnDto,
  ) {
    return this.service.returnSale(r.principal.userId, b, id, d);
  }
}
