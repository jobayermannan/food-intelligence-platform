import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { DatabaseService } from "../database/database.service";
import { users, sessions, actionTokens } from "../database/schema";
import { authConfig } from "../config";
import { RegisterDto } from "./auth.dto";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secretToken = () => randomBytes(32).toString("base64url");
const verifyMax = 24 * 60 * 60 * 1000;
const resetMax = 30 * 60 * 1000;
const sessionMax = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly attempts = new Map<
    string,
    { count: number; until: number }
  >();
  constructor(private readonly database: DatabaseService) {}

  private limit(key: string, maximum = 8) {
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || current.until < now) {
      this.attempts.set(key, { count: 1, until: now + 15 * 60 * 1000 });
      return;
    }
    if (current.count >= maximum)
      throw new HttpException(
        "Too many requests",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    current.count++;
  }

  private async mail(email: string, subject: string, token: string) {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? "localhost",
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
    });
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "development@food-intelligence.local",
      to: email,
      subject,
      text: `Food Intelligence Platform ${subject.toLowerCase()} token: ${token}\nUse this token in the matching API action.`,
    });
  }

  private async action(
    userId: string,
    email: string,
    purpose: "verify_email" | "reset_password",
  ) {
    const token = secretToken();
    const expiresAt = new Date(
      Date.now() + (purpose === "verify_email" ? verifyMax : resetMax),
    );
    await this.database.db
      .insert(actionTokens)
      .values({ userId, purpose, tokenHash: hash(token), expiresAt });
    await this.mail(
      email,
      purpose === "verify_email" ? "Verify email" : "Reset password",
      token,
    );
  }

  async register(dto: RegisterDto, ip: string) {
    const email = dto.email.trim().toLowerCase();
    this.limit(`register:${ip}`, 20);
    this.limit(`register-email:${email}`, 3);
    const found = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (found[0]?.verifiedAt) return;
    if (found[0]) {
      await this.action(found[0].id, email, "verify_email");
      return;
    }
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    const [created] = await this.database.db
      .insert(users)
      .values({ email, displayName: dto.displayName, passwordHash })
      .onConflictDoNothing()
      .returning();
    if (created) await this.action(created.id, email, "verify_email");
  }

  async verify(token: string) {
    await this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(actionTokens)
        .where(
          and(
            eq(actionTokens.tokenHash, hash(token)),
            eq(actionTokens.purpose, "verify_email"),
            isNull(actionTokens.consumedAt),
            gt(actionTokens.expiresAt, new Date()),
          ),
        )
        .for("update");
      if (!row) throw new BadRequestException("Invalid or expired token");
      await tx
        .update(actionTokens)
        .set({ consumedAt: new Date() })
        .where(eq(actionTokens.id, row.id));
      await tx
        .update(users)
        .set({ verifiedAt: new Date() })
        .where(eq(users.id, row.userId));
    });
  }

  async login(emailInput: string, password: string, ip: string) {
    const email = emailInput.trim().toLowerCase();
    this.limit(`login:${ip}:${email}`);
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    const valid = user
      ? await argon2.verify(user.passwordHash, password)
      : false;
    if (!valid || !user.verifiedAt || user.disabledAt)
      throw new UnauthorizedException("Invalid credentials");
    const refreshToken = secretToken();
    const [session] = await this.database.db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: hash(refreshToken),
        familyId: randomUUID(),
        expiresAt: new Date(Date.now() + sessionMax),
      })
      .returning();
    return { accessToken: this.access(user.id, session.id), refreshToken };
  }

  private access(userId: string, sessionId: string) {
    const cfg = authConfig();
    return jwt.sign({ sid: sessionId }, cfg.secret, {
      algorithm: "HS256",
      subject: userId,
      issuer: cfg.issuer,
      audience: cfg.audience,
      expiresIn: "10m",
    });
  }

  async refresh(token: string) {
    const tokenHash = hash(token);
    const result = await this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, tokenHash))
        .for("update");
      if (!current) throw new UnauthorizedException();
      if (current.replacedById || current.revokedAt) {
        await tx
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.familyId, current.familyId));
        return { replay: true as const };
      }
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, current.userId));
      if (
        current.expiresAt <= new Date() ||
        !user?.verifiedAt ||
        user.disabledAt
      )
        throw new UnauthorizedException();
      const nextToken = secretToken();
      const [next] = await tx
        .insert(sessions)
        .values({
          userId: current.userId,
          familyId: current.familyId,
          tokenHash: hash(nextToken),
          expiresAt: current.expiresAt,
        })
        .returning();
      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), replacedById: next.id })
        .where(eq(sessions.id, current.id));
      return {
        accessToken: this.access(current.userId, next.id),
        refreshToken: nextToken,
      };
    });
    if ("replay" in result) throw new UnauthorizedException("Session replay");
    return result;
  }

  async logout(sessionId: string) {
    const [current] = await this.database.db
      .select({ familyId: sessions.familyId })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    if (current)
      await this.database.db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.familyId, current.familyId));
  }
  async logoutAll(userId: string) {
    await this.database.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, userId));
  }

  async forgot(emailInput: string, ip: string) {
    this.limit(`forgot:${ip}`, 6);
    const email = emailInput.trim().toLowerCase();
    this.limit(`forgot-email:${email}`, 3);
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (user?.verifiedAt && !user.disabledAt)
      await this.action(user.id, email, "reset_password");
  }

  async reset(token: string, password: string) {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(actionTokens)
        .where(
          and(
            eq(actionTokens.tokenHash, hash(token)),
            eq(actionTokens.purpose, "reset_password"),
            isNull(actionTokens.consumedAt),
            gt(actionTokens.expiresAt, new Date()),
          ),
        )
        .for("update");
      if (!row) throw new BadRequestException("Invalid or expired token");
      await tx
        .update(actionTokens)
        .set({ consumedAt: new Date() })
        .where(eq(actionTokens.id, row.id));
      await tx
        .update(users)
        .set({ passwordHash })
        .where(eq(users.id, row.userId));
      await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.userId, row.userId));
    });
  }

  async me(userId: string) {
    const [user] = await this.database.db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.id, userId));
    return user;
  }
}
