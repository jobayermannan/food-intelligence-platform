import { Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { AccessService } from "../common/access.service";
import { DatabaseService } from "../database/database.service";
import { categories, products, suppliers, inventory } from "../database/schema";
import {
  CategoryDto,
  SupplierDto,
  UpdateSupplierDto,
  ProductDto,
  UpdateProductDto,
} from "./catalog.dto";

@Injectable()
export class CatalogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: AccessService,
  ) {}
  async createCategory(userId: string, businessId: string, dto: CategoryDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [row] = await this.database.db
      .insert(categories)
      .values({ businessId, name: dto.name })
      .returning();
    return row;
  }
  async categories(userId: string, businessId: string) {
    await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    return this.database.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.businessId, businessId),
          isNull(categories.archivedAt),
        ),
      )
      .limit(100);
  }
  async createSupplier(userId: string, businessId: string, dto: SupplierDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [row] = await this.database.db
      .insert(suppliers)
      .values({ businessId, name: dto.name, reference: dto.reference })
      .returning();
    return row;
  }
  async suppliers(userId: string, businessId: string) {
    await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    return this.database.db
      .select()
      .from(suppliers)
      .where(
        and(eq(suppliers.businessId, businessId), isNull(suppliers.archivedAt)),
      )
      .limit(100);
  }
  async supplier(userId: string, businessId: string, id: string) {
    await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    const [row] = await this.database.db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.businessId, businessId), eq(suppliers.id, id)));
    if (!row) throw new NotFoundException();
    return row;
  }
  async updateSupplier(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [row] = await this.database.db
      .update(suppliers)
      .set({
        name: dto.name,
        reference: dto.reference,
        archivedAt:
          dto.status === "inactive"
            ? new Date()
            : dto.status === "active"
              ? null
              : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(suppliers.businessId, businessId), eq(suppliers.id, id)))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
  async createProduct(userId: string, businessId: string, dto: ProductDto) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    const [category] = await this.database.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.businessId, businessId),
          eq(categories.id, dto.categoryId),
          isNull(categories.archivedAt),
        ),
      );
    if (!category) throw new NotFoundException("Category not found");
    const [row] = await this.database.db
      .insert(products)
      .values({
        businessId,
        categoryId: dto.categoryId,
        sku: dto.sku,
        name: dto.name,
        baseUnit: dto.baseUnit,
        packageDefinition: dto.packageDefinition,
        sellingPrice: dto.sellingPrice,
      })
      .returning();
    return row;
  }
  async products(userId: string, businessId: string) {
    await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    return this.database.db
      .select()
      .from(products)
      .where(
        and(eq(products.businessId, businessId), isNull(products.archivedAt)),
      )
      .limit(100);
  }
  async product(userId: string, businessId: string, id: string) {
    await this.access.require(userId, businessId, [
      "OWNER",
      "ADMIN",
      "STAFF",
      "VIEWER",
    ]);
    const [row] = await this.database.db
      .select()
      .from(products)
      .where(and(eq(products.businessId, businessId), eq(products.id, id)));
    if (!row) throw new NotFoundException();
    return row;
  }
  async updateProduct(
    userId: string,
    businessId: string,
    id: string,
    dto: UpdateProductDto,
  ) {
    await this.access.require(userId, businessId, ["OWNER", "ADMIN"]);
    if (dto.categoryId) {
      const [category] = await this.database.db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.businessId, businessId),
            eq(categories.id, dto.categoryId),
          ),
        );
      if (!category) throw new NotFoundException("Category not found");
    }
    const [row] = await this.database.db
      .update(products)
      .set({
        categoryId: dto.categoryId,
        name: dto.name,
        sellingPrice: dto.sellingPrice,
        archivedAt:
          dto.status === "inactive"
            ? new Date()
            : dto.status === "active"
              ? null
              : undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(products.businessId, businessId), eq(products.id, id)))
      .returning();
    if (!row) throw new NotFoundException();
    return row;
  }
}
