import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import argon2 from "argon2";
import { createHash } from "node:crypto";
import { AccessService, Role } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import {
  auditEvents,
  businesses,
  locations,
  memberships,
  membershipLocations,
  roles,
  users,
} from "../database/schema";
import {
  CreateBusinessDto,
  CreateLocationDto,
  MemberDto,
  ChangeRoleDto,
  UpdateLocationDto,
  ExpirySettingsDto,
} from "./business.dto";

@Injectable()
export class BusinessService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}
  private async role(code: Role) {
    const [found] = await this.database.db
      .select()
      .from(roles)
      .where(eq(roles.code, code));
    if (!found) throw new Error("Roles not seeded. Run migrations.");
    return found.id;
  }

  async create(userId: string, dto: CreateBusinessDto) {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user?.verifiedAt) throw new ForbiddenException();
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: dto.timezone });
    } catch {
      throw new BadRequestException("Invalid timezone");
    }
    const currency = dto.currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency))
      throw new BadRequestException("Invalid currency");
    const ownerRoleId = await this.role("OWNER");
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          name: dto.name,
          timezone: dto.timezone,
          currency,
          defaultTaxRate: dto.defaultTaxRate,
        }),
      )
      .digest("hex");
    return this.database.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(businesses)
        .where(
          and(
            eq(businesses.createdByUserId, userId),
            eq(businesses.creationKey, dto.requestKey),
          ),
        );
      if (existing) {
        if (existing.creationHash !== requestHash)
          throw new ConflictException("Operation key reused");
        return existing;
      }
      const [business] = await tx
        .insert(businesses)
        .values({
          name: dto.name,
          timezone: dto.timezone,
          currency,
          defaultTaxRate: String(dto.defaultTaxRate),
          createdByUserId: userId,
          creationKey: dto.requestKey,
          creationHash: requestHash,
        })
        .returning();
      const [ownerMembership] = await tx
        .insert(memberships)
        .values({
          businessId: business.id,
          userId,
          roleId: ownerRoleId,
          grantedByUserId: userId,
        })
        .returning();
      await tx.insert(auditEvents).values({
        businessId: business.id,
        actorUserId: userId,
        targetUserId: userId,
        membershipId: ownerMembership.id,
        action: "BUSINESS_CREATED",
        newRole: "OWNER",
      });
      return business;
    });
  }

  async list(userId: string) {
    return this.database.db
      .select({
        id: businesses.id,
        name: businesses.name,
        role: roles.code,
        timezone: businesses.timezone,
        currency: businesses.currency,
      })
      .from(memberships)
      .innerJoin(businesses, eq(memberships.businessId, businesses.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(eq(memberships.userId, userId), eq(memberships.status, "active")),
      );
  }

  async settings(userId: string, businessId: string, dto: ExpirySettingsDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    if (dto.warningHours <= dto.criticalHours)
      throw new BadRequestException("Warning must exceed critical");
    const [row] = await this.database.db
      .update(businesses)
      .set({
        expiryCriticalHours: dto.criticalHours,
        expiryWarningHours: dto.warningHours,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, businessId))
      .returning();
    return row;
  }

  async addLocation(
    userId: string,
    businessId: string,
    dto: CreateLocationDto,
  ) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [row] = await this.database.db
      .insert(locations)
      .values({ businessId, code: dto.code, name: dto.name })
      .returning();
    return row;
  }
  async updateLocation(
    userId: string,
    businessId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [row] = await this.database.db
      .update(locations)
      .set({
        ...(dto.name ? { name: dto.name } : {}),
        archivedAt:
          dto.status === "inactive"
            ? new Date()
            : dto.status === "active"
              ? null
              : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(eq(locations.businessId, businessId), eq(locations.id, locationId)),
      )
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
  async listLocations(userId: string, businessId: string) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    if (scope.locations !== "all" && !scope.locations.length) return [];
    return this.database.db
      .select()
      .from(locations)
      .where(
        scope.locations === "all"
          ? eq(locations.businessId, businessId)
          : and(
              eq(locations.businessId, businessId),
              inArray(locations.id, scope.locations),
            ),
      );
  }

  private async reauthenticate(userId: string, password?: string) {
    if (!password) throw new ForbiddenException("Reauthentication required");
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    if (!user || !(await argon2.verify(user.passwordHash, password)))
      throw new ForbiddenException("Reauthentication failed");
  }
  async addMember(userId: string, businessId: string, dto: MemberDto) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
    ]);
    if (scope.role === "ADMIN" && !["STAFF", "VIEWER"].includes(dto.role))
      throw new ForbiddenException();
    if (dto.role === "OWNER" || dto.role === "ADMIN") {
      if (scope.role !== "OWNER") throw new ForbiddenException();
      await this.reauthenticate(userId, dto.password);
    }
    const [target] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.id, dto.userId));
    if (!target?.verifiedAt || target.disabledAt) throw new NotFoundException();
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(memberships)
        .values({
          businessId,
          userId: dto.userId,
          roleId: await this.role(dto.role),
          grantedByUserId: userId,
        })
        .returning();
      await tx.insert(auditEvents).values({
        businessId,
        actorUserId: userId,
        targetUserId: dto.userId,
        membershipId: row.id,
        action: "MEMBER_ADDED",
        newRole: dto.role,
      });
      return row;
    });
  }
  async listMembers(userId: string, businessId: string) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    return this.database.db
      .select({
        id: memberships.id,
        userId: users.id,
        email: users.email,
        role: roles.code,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(eq(memberships.businessId, businessId));
  }
  async changeRole(
    userId: string,
    businessId: string,
    memberId: string,
    dto: ChangeRoleDto,
  ) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
    ]);
    if (scope.role === "ADMIN" && !["STAFF", "VIEWER"].includes(dto.role))
      throw new ForbiddenException();
    if (dto.role === "OWNER" || dto.role === "ADMIN") {
      if (scope.role !== "OWNER") throw new ForbiddenException();
      await this.reauthenticate(userId, dto.password);
    }
    return this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from businesses where id = ${businessId} for update`,
      );
      const [target] = await tx
        .select({
          id: memberships.id,
          userId: memberships.userId,
          role: roles.code,
        })
        .from(memberships)
        .innerJoin(roles, eq(memberships.roleId, roles.id))
        .where(
          and(
            eq(memberships.businessId, businessId),
            eq(memberships.id, memberId),
            eq(memberships.status, "active"),
          ),
        );
      if (!target) throw new NotFoundException();
      if (scope.role === "ADMIN" && !["STAFF", "VIEWER"].includes(target.role))
        throw new ForbiddenException();
      if (dto.role === "OWNER") {
        const [recipient] = await tx
          .select({
            verifiedAt: users.verifiedAt,
            disabledAt: users.disabledAt,
          })
          .from(users)
          .where(eq(users.id, target.userId));
        if (!recipient?.verifiedAt || recipient.disabledAt)
          throw new NotFoundException();
      }
      if (target.role === "OWNER" && dto.role !== "OWNER") {
        await this.reauthenticate(userId, dto.password);
        const ownerRoleId = await this.role("OWNER");
        const owners = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.businessId, businessId),
              eq(memberships.roleId, ownerRoleId),
              eq(memberships.status, "active"),
            ),
          );
        if (owners.length <= 1)
          throw new ConflictException("Last owner cannot be removed");
      }
      const [changed] = await tx
        .update(memberships)
        .set({ roleId: await this.role(dto.role), updatedAt: new Date() })
        .where(eq(memberships.id, memberId))
        .returning();
      await tx.insert(auditEvents).values({
        businessId,
        actorUserId: userId,
        targetUserId: target.userId,
        membershipId: memberId,
        action: "ROLE_CHANGED",
        previousRole: target.role,
        newRole: dto.role,
      });
      return changed;
    });
  }
  async removeMember(
    userId: string,
    businessId: string,
    memberId: string,
    password?: string,
  ) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
    ]);
    return this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select id from businesses where id = ${businessId} for update`,
      );
      const [target] = await tx
        .select({
          id: memberships.id,
          userId: memberships.userId,
          role: roles.code,
        })
        .from(memberships)
        .innerJoin(roles, eq(memberships.roleId, roles.id))
        .where(
          and(
            eq(memberships.businessId, businessId),
            eq(memberships.id, memberId),
            eq(memberships.status, "active"),
          ),
        );
      if (!target) throw new NotFoundException();
      if (scope.role === "ADMIN" && !["STAFF", "VIEWER"].includes(target.role))
        throw new ForbiddenException();
      if (target.role === "OWNER") {
        if (scope.role !== "OWNER") throw new ForbiddenException();
        await this.reauthenticate(userId, password);
        const ownerRoleId = await this.role("OWNER");
        const owners = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(
            and(
              eq(memberships.businessId, businessId),
              eq(memberships.roleId, ownerRoleId),
              eq(memberships.status, "active"),
            ),
          );
        if (owners.length <= 1)
          throw new ConflictException("Last owner cannot be removed");
      }
      await tx
        .update(memberships)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(memberships.id, memberId));
      await tx
        .delete(membershipLocations)
        .where(eq(membershipLocations.membershipId, memberId));
      await tx.insert(auditEvents).values({
        businessId,
        actorUserId: userId,
        targetUserId: target.userId,
        membershipId: memberId,
        action: "MEMBER_REVOKED",
        previousRole: target.role,
      });
    });
  }
  async setLocations(
    userId: string,
    businessId: string,
    memberId: string,
    locationIds: string[],
  ) {
    const scope = await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
    ]);
    const [target] = await this.database.db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        role: roles.code,
      })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.businessId, businessId),
          eq(memberships.id, memberId),
          eq(memberships.status, "active"),
        ),
      );
    if (!target) throw new NotFoundException();
    if (scope.role === "ADMIN" && !["STAFF", "VIEWER"].includes(target.role))
      throw new ForbiddenException();
    if (!["STAFF", "VIEWER"].includes(target.role))
      throw new BadRequestException(
        "Only staff and viewer use location grants",
      );
    const valid = locationIds.length
      ? await this.database.db
          .select({ id: locations.id })
          .from(locations)
          .where(
            and(
              eq(locations.businessId, businessId),
              inArray(locations.id, locationIds),
            ),
          )
      : [];
    if (valid.length !== locationIds.length) throw new NotFoundException();
    return this.database.db.transaction(async (tx) => {
      await tx
        .delete(membershipLocations)
        .where(
          and(
            eq(membershipLocations.businessId, businessId),
            eq(membershipLocations.membershipId, memberId),
          ),
        );
      if (locationIds.length)
        await tx.insert(membershipLocations).values(
          locationIds.map((locationId) => ({
            businessId,
            membershipId: memberId,
            locationId,
          })),
        );
      await tx.insert(auditEvents).values({
        businessId,
        actorUserId: userId,
        targetUserId: target.userId,
        membershipId: memberId,
        action: "LOCATION_GRANTS_CHANGED",
        locationCount: locationIds.length,
      });
      return { locationIds };
    });
  }
  async listAudit(userId: string, businessId: string) {
    await this.access.require(userId, businessId, ["OWNER"]);
    return this.database.db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.businessId, businessId))
      .limit(100);
  }
}
