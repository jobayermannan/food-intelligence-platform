import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { memberships, membershipLocations, roles } from "../database/schema";

export type Role = "OWNER" | "ADMIN" | "STAFF" | "VIEWER";
export type Scope = {
  businessId: string;
  membershipId: string;
  role: Role;
  locations: string[] | "all";
};

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);
  constructor(private readonly database: DatabaseService) {}

  async require(
    userId: string,
    businessId: string,
    allowed: Role[],
    locationId?: string,
  ): Promise<Scope> {
    const [member] = await this.database.db
      .select({ id: memberships.id, code: roles.code })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.businessId, businessId),
          eq(memberships.userId, userId),
          eq(memberships.status, "active"),
        ),
      );
    if (!member) {
      this.logger.warn(
        `access_denied membership user=${userId} business=${businessId}`,
      );
      throw new NotFoundException();
    }
    const role = member.code as Role;
    if (!allowed.includes(role)) {
      this.logger.warn(
        `access_denied role user=${userId} business=${businessId}`,
      );
      throw new ForbiddenException();
    }
    if (role === "OWNER" || role === "ADMIN")
      return { businessId, membershipId: member.id, role, locations: "all" };
    const grants = await this.database.db
      .select({ id: membershipLocations.locationId })
      .from(membershipLocations)
      .where(
        and(
          eq(membershipLocations.businessId, businessId),
          eq(membershipLocations.membershipId, member.id),
        ),
      );
    const locations = grants.map((g) => g.id);
    if (locationId && !locations.includes(locationId)) {
      this.logger.warn(
        `access_denied location user=${userId} business=${businessId} location=${locationId}`,
      );
      throw new NotFoundException();
    }
    return { businessId, membershipId: member.id, role, locations };
  }
}
