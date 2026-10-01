import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { InsightsService } from "./insights.service";
import { ApproveDiscountDto, RecommendationDto } from "./insights.dto";
@ApiBearerAuth()
@ApiTags("intelligence")
@Controller("api/v1/businesses/:businessId")
export class InsightsController {
  constructor(private readonly service: InsightsService) {}
  @Get("inventory/expiry") expiry(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Query("locationId") loc?: string,
  ) {
    return this.service.expiry(r.principal.userId, b, loc);
  }
  @Post("discount-recommendations") recommendation(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() dto: RecommendationDto,
  ) {
    return this.service.recommendation(r.principal.userId, b, dto);
  }
  @Post("discounts") approve(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Body() dto: ApproveDiscountDto,
  ) {
    return this.service.approve(r.principal.userId, b, dto);
  }
  @Get("analytics/:kind") analytics(
    @Req() r: AuthedRequest,
    @Param("businessId") b: string,
    @Param("kind") k: string,
    @Query("locationId") loc?: string,
  ) {
    return this.service.analytics(r.principal.userId, b, k, loc);
  }
}
