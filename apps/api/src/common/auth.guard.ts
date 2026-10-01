import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { eq, and, isNull, gt, isNotNull } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { DatabaseService } from "../database/database.service";
import { sessions, users } from "../database/schema";
import { authConfig } from "../config";
import { AuthedRequest } from "./principal";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly database: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>("public", [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
    if (!match) throw new UnauthorizedException();
    try {
      const cfg = authConfig();
      const claims = jwt.verify(match[1], cfg.secret, {
        algorithms: ["HS256"],
        issuer: cfg.issuer,
        audience: cfg.audience,
      });
      if (
        typeof claims === "string" ||
        !claims.sub ||
        typeof claims.sid !== "string"
      )
        throw new Error("Invalid claims");
      const found = await this.database.db
        .select({ id: sessions.id })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(
          and(
            eq(sessions.id, claims.sid),
            eq(sessions.userId, claims.sub),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
            isNull(users.disabledAt),
            isNotNull(users.verifiedAt),
          ),
        );
      if (found.length !== 1) throw new Error("Inactive session");
      req.principal = { userId: claims.sub, sessionId: claims.sid };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
