import { Controller, HttpCode, Ip, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Public } from "../common/public.decorator";
import { AuthService } from "../auth/auth.service";
import { authConfig } from "../config";
import { AuthedRequest } from "../common/principal";
import { DemoService } from "./demo.service";

@ApiTags("demo")
@Controller("api/v1/demo")
export class DemoController {
  constructor(
    private readonly demo: DemoService,
    private readonly auth: AuthService,
  ) {}
  private cookie(res: Response, token: string) {
    res.cookie("refresh_token", token, {
      httpOnly: true,
      secure: authConfig().cookieSecure,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 4 * 60 * 60 * 1000,
    });
  }
  @Public()
  @Post("session")
  @HttpCode(200)
  async session(@Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const user = await this.demo.bootstrap(ip);
    const session = await this.auth.issueDemoSession(user.id);
    this.cookie(res, session.refreshToken);
    return { accessToken: session.accessToken };
  }
  @Post("reset")
  @HttpCode(200)
  async reset(@Req() req: AuthedRequest) {
    return this.demo.reset(req.principal.userId);
  }
}
