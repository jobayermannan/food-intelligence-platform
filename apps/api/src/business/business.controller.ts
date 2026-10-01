import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthedRequest } from "../common/principal";
import { BusinessService } from "./business.service";
import {
  CreateBusinessDto,
  CreateLocationDto,
  UpdateLocationDto,
  MemberDto,
  ChangeRoleDto,
  LocationGrantsDto,
  ExpirySettingsDto,
  ReauthenticateDto,
} from "./business.dto";

@ApiBearerAuth()
@ApiTags("businesses")
@Controller("api/v1/businesses")
export class BusinessController {
  constructor(private readonly service: BusinessService) {}
  @Post() create(@Req() req: AuthedRequest, @Body() dto: CreateBusinessDto) {
    return this.service.create(req.principal.userId, dto);
  }
  @Get() list(@Req() req: AuthedRequest) {
    return this.service.list(req.principal.userId);
  }
  @Patch(":businessId/expiry-settings") settings(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Body() dto: ExpirySettingsDto,
  ) {
    return this.service.settings(req.principal.userId, b, dto);
  }
  @Post(":businessId/locations") addLocation(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.service.addLocation(req.principal.userId, b, dto);
  }
  @Get(":businessId/locations") locations(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.listLocations(req.principal.userId, b);
  }
  @Patch(":businessId/locations/:locationId") updateLocation(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Param("locationId") id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.service.updateLocation(req.principal.userId, b, id, dto);
  }
  @Post(":businessId/members") addMember(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Body() dto: MemberDto,
  ) {
    return this.service.addMember(req.principal.userId, b, dto);
  }
  @Get(":businessId/members") members(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.listMembers(req.principal.userId, b);
  }
  @Get(":businessId/audit-events") audit(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
  ) {
    return this.service.listAudit(req.principal.userId, b);
  }
  @Patch(":businessId/members/:memberId") role(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Param("memberId") id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.service.changeRole(req.principal.userId, b, id, dto);
  }
  @Delete(":businessId/members/:memberId") @HttpCode(204) remove(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Param("memberId") id: string,
    @Body() dto: ReauthenticateDto,
  ) {
    return this.service.removeMember(req.principal.userId, b, id, dto.password);
  }
  @Put(":businessId/members/:memberId/locations") grants(
    @Req() req: AuthedRequest,
    @Param("businessId") b: string,
    @Param("memberId") id: string,
    @Body() dto: LocationGrantsDto,
  ) {
    return this.service.setLocations(
      req.principal.userId,
      b,
      id,
      dto.locationIds,
    );
  }
}
