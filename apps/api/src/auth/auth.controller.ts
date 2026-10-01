import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  LoginDto,
  TokenDto,
  ForgotDto,
  ResetDto,
} from "./auth.dto";
import { Public } from "../common/public.decorator";
import { AuthedRequest } from "../common/principal";
import { authConfig } from "../config";

@ApiTags("auth")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private cookie(res: Response, token: string) {
    res.cookie("refresh_token", token, {
      httpOnly: true,
      secure: authConfig().cookieSecure,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  private origin(req: Request) {
    if (req.headers.origin !== authConfig().origin)
      throw new UnauthorizedException("Origin required");
  }

  @Public()
  @Post("register")
  @HttpCode(202)
  async register(@Body() dto: RegisterDto, @Ip() ip: string) {
    await this.auth.register(dto, ip);
    return { message: "If eligible, verification instructions were sent" };
  }
  @Public()
  @Post("verify-email")
  @HttpCode(204)
  async verify(@Body() dto: TokenDto) {
    await this.auth.verify(dto.token);
  }
  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password, ip);
    this.cookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }
  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    const token = req.cookies?.refresh_token as string | undefined;
    if (!token) throw new UnauthorizedException();
    const result = await this.auth.refresh(token);
    this.cookie(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }
  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.auth.logout(req.principal.sessionId);
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
  }
  @ApiBearerAuth()
  @Post("logout-all")
  @HttpCode(204)
  async logoutAll(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.origin(req);
    await this.auth.logoutAll(req.principal.userId);
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
  }
  @Public()
  @Post("forgot-password")
  @HttpCode(202)
  async forgot(@Body() dto: ForgotDto, @Ip() ip: string) {
    await this.auth.forgot(dto.email, ip);
    return { message: "If eligible, recovery instructions were sent" };
  }
  @Public()
  @Post("reset-password")
  @HttpCode(204)
  async reset(@Body() dto: ResetDto) {
    await this.auth.reset(dto.token, dto.password);
  }
  @ApiBearerAuth() @Get("me") me(@Req() req: AuthedRequest) {
    return this.auth.me(req.principal.userId);
  }
}
