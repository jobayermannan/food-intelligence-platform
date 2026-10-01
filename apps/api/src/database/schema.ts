import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  uniqueIndex,
  index,
  check,
  foreignKey,
  primaryKey,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const qty = (name: string) => numeric(name, { precision: 18, scale: 6 });
const money = (name: string) => numeric(name, { precision: 20, scale: 6 });

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const businesses = pgTable(
  "businesses",
  {
    id: id(),
    name: text("name").notNull(),
    timezone: text("timezone").notNull(),
    currency: text("currency").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    creationKey: text("creation_key").notNull(),
    creationHash: text("creation_hash"),
    defaultTaxRate: numeric("default_tax_rate", {
      precision: 8,
      scale: 6,
    }).notNull(),
    expiryCriticalHours: integer("expiry_critical_hours").notNull().default(24),
    expiryWarningHours: integer("expiry_warning_hours").notNull().default(72),
    status: text("status").notNull().default("active"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("business_creator_key_uq").on(t.createdByUserId, t.creationKey),
    check(
      "business_tax_check",
      sql`${t.defaultTaxRate} >= 0 and ${t.defaultTaxRate} <= 1`,
    ),
    check(
      "business_expiry_check",
      sql`${t.expiryCriticalHours} > 0 and ${t.expiryWarningHours} > ${t.expiryCriticalHours}`,
    ),
  ],
);

export const roles = pgTable("roles", {
  id: id(),
  code: text("code").notNull().unique(),
  createdAt: created(),
});

export const memberships = pgTable(
  "business_memberships",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    status: text("status").notNull().default("active"),
    grantedByUserId: uuid("granted_by_user_id").references(() => users.id),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("memberships_business_user_uq").on(t.businessId, t.userId),
    uniqueIndex("memberships_business_id_uq").on(t.businessId, t.id),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const sessions = pgTable(
  "auth_sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("refresh_token_hash").notNull(),
    familyId: uuid("token_family_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedById: uuid("replaced_by_session_id"),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("session_token_hash_uq").on(t.tokenHash),
    index("sessions_user_family_idx").on(t.userId, t.familyId),
  ],
);

export const actionTokens = pgTable(
  "auth_action_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    purpose: text("purpose").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("action_token_hash_uq").on(t.tokenHash),
    check(
      "action_purpose_check",
      sql`${t.purpose} in ('verify_email','reset_password')`,
    ),
  ],
);

export const locations = pgTable(
  "inventory_locations",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("locations_business_code_uq").on(t.businessId, t.code),
    uniqueIndex("locations_business_id_uq").on(t.businessId, t.id),
  ],
);

export const membershipLocations = pgTable(
  "membership_locations",
  {
    businessId: uuid("business_id").notNull(),
    membershipId: uuid("membership_id").notNull(),
    locationId: uuid("location_id").notNull(),
    createdAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.membershipId, t.locationId] }),
    foreignKey({
      columns: [t.businessId, t.membershipId],
      foreignColumns: [memberships.businessId, memberships.id],
    }),
    foreignKey({
      columns: [t.businessId, t.locationId],
      foreignColumns: [locations.businessId, locations.id],
    }),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id),
    membershipId: uuid("membership_id").notNull(),
    action: text("action").notNull(),
    previousRole: text("previous_role"),
    newRole: text("new_role"),
    locationCount: integer("location_count"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.businessId, t.membershipId],
      foreignColumns: [memberships.businessId, memberships.id],
    }),
    index("audit_business_time_idx").on(t.businessId, t.occurredAt),
    check(
      "audit_action_check",
      sql`${t.action} in ('BUSINESS_CREATED','MEMBER_ADDED','ROLE_CHANGED','MEMBER_REVOKED','LOCATION_GRANTS_CHANGED')`,
    ),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("categories_business_name_uq").on(t.businessId, t.name),
    uniqueIndex("categories_business_id_uq").on(t.businessId, t.id),
  ],
);

export const suppliers = pgTable(
  "suppliers",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    name: text("name").notNull(),
    reference: text("external_reference"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("suppliers_business_id_uq").on(t.businessId, t.id),
    index("suppliers_business_idx").on(t.businessId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    categoryId: uuid("category_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    baseUnit: text("base_unit").notNull(),
    packageDefinition: text("package_definition"),
    sellingPrice: money("selling_price").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("products_business_sku_uq").on(t.businessId, t.sku),
    uniqueIndex("products_business_id_uq").on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.categoryId],
      foreignColumns: [categories.businessId, categories.id],
    }),
    check("products_price_check", sql`${t.sellingPrice} >= 0`),
    check(
      "products_unit_check",
      sql`${t.baseUnit} in ('piece','kg','gram','litre','ml','package')`,
    ),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    locationId: uuid("location_id").notNull(),
    productId: uuid("product_id").notNull(),
    onHand: qty("on_hand_quantity").notNull().default("0"),
    reorderLevel: qty("reorder_level").notNull().default("0"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("inventory_business_location_product_uq").on(
      t.businessId,
      t.locationId,
      t.productId,
    ),
    uniqueIndex("inventory_business_id_uq").on(t.businessId, t.id),
    uniqueIndex("inventory_business_id_product_uq").on(
      t.businessId,
      t.id,
      t.productId,
    ),
    foreignKey({
      columns: [t.businessId, t.locationId],
      foreignColumns: [locations.businessId, locations.id],
    }),
    foreignKey({
      columns: [t.businessId, t.productId],
      foreignColumns: [products.businessId, products.id],
    }),
    check(
      "inventory_nonnegative_check",
      sql`${t.onHand} >= 0 and ${t.reorderLevel} >= 0`,
    ),
  ],
);

export const batches = pgTable(
  "inventory_batches",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    inventoryId: uuid("inventory_id").notNull(),
    productId: uuid("product_id").notNull(),
    supplierId: uuid("supplier_id"),
    lotReference: text("lot_reference"),
    provenanceReference: text("provenance_reference"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    expiryStatus: text("expiry_status").notNull(),
    unitCost: money("unit_cost").notNull(),
    remaining: qty("remaining_quantity").notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("batches_business_id_uq").on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.inventoryId, t.productId],
      foreignColumns: [inventory.businessId, inventory.id, inventory.productId],
    }),
    foreignKey({
      columns: [t.businessId, t.productId],
      foreignColumns: [products.businessId, products.id],
    }),
    foreignKey({
      columns: [t.businessId, t.supplierId],
      foreignColumns: [suppliers.businessId, suppliers.id],
    }),
    index("batches_inventory_expiry_idx").on(t.inventoryId, t.expiresAt),
    check(
      "batches_nonnegative_check",
      sql`${t.remaining} >= 0 and ${t.unitCost} >= 0`,
    ),
    check(
      "batches_expiry_status_check",
      sql`${t.expiryStatus} in ('known','unknown','nonperishable')`,
    ),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    locationId: uuid("location_id").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    orderNumber: text("order_number").notNull(),
    status: text("status").notNull().default("completed"),
    currency: text("currency").notNull(),
    grossAmount: money("gross_amount").notNull(),
    discountAmount: money("discount_amount").notNull(),
    netAmount: money("net_amount").notNull(),
    taxAmount: money("tax_amount").notNull(),
    totalAmount: money("total_amount").notNull(),
    requestKey: text("request_key").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    requestHash: text("request_hash").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("orders_business_id_uq").on(t.businessId, t.id),
    uniqueIndex("orders_business_number_uq").on(t.businessId, t.orderNumber),
    uniqueIndex("orders_business_request_uq").on(t.businessId, t.requestKey),
    foreignKey({
      columns: [t.businessId, t.locationId],
      foreignColumns: [locations.businessId, locations.id],
    }),
    index("orders_business_location_time_idx").on(
      t.businessId,
      t.locationId,
      t.completedAt,
    ),
    check(
      "orders_total_check",
      sql`${t.grossAmount} >= 0 and ${t.discountAmount} >= 0 and ${t.netAmount} >= 0 and ${t.taxAmount} >= 0 and ${t.totalAmount} >= 0 and ${t.netAmount} = ${t.grossAmount} - ${t.discountAmount} and ${t.totalAmount} = ${t.netAmount} + ${t.taxAmount}`,
    ),
  ],
);

export const discounts = pgTable(
  "discounts",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    productId: uuid("product_id").notNull(),
    batchId: uuid("batch_id"),
    percent: numeric("percent", { precision: 6, scale: 3 }).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    explanation: text("explanation").notNull(),
    approvedByUserId: uuid("approved_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("discounts_business_id_uq").on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.productId],
      foreignColumns: [products.businessId, products.id],
    }),
    foreignKey({
      columns: [t.businessId, t.batchId],
      foreignColumns: [batches.businessId, batches.id],
    }),
    check(
      "discount_percent_check",
      sql`${t.percent} >= 0 and ${t.percent} <= 100 and ${t.validUntil} > ${t.validFrom}`,
    ),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    orderId: uuid("order_id").notNull(),
    productId: uuid("product_id").notNull(),
    discountId: uuid("discount_id"),
    productName: text("product_name_snapshot").notNull(),
    sku: text("sku_snapshot").notNull(),
    baseUnit: text("base_unit_snapshot").notNull(),
    quantity: qty("quantity").notNull(),
    unitPrice: money("unit_price").notNull(),
    grossAmount: money("gross_amount").notNull(),
    discountPercent: numeric("discount_percent", {
      precision: 6,
      scale: 3,
    }).notNull(),
    discountAmount: money("discount_amount").notNull(),
    netAmount: money("net_amount").notNull(),
    taxRate: numeric("tax_rate", { precision: 8, scale: 6 }).notNull(),
    taxAmount: money("tax_amount").notNull(),
    totalAmount: money("total_amount").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("sale_items_business_id_uq").on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.orderId],
      foreignColumns: [orders.businessId, orders.id],
    }),
    foreignKey({
      columns: [t.businessId, t.productId],
      foreignColumns: [products.businessId, products.id],
    }),
    foreignKey({
      columns: [t.businessId, t.discountId],
      foreignColumns: [discounts.businessId, discounts.id],
    }),
    check(
      "sale_item_amount_check",
      sql`${t.quantity} > 0 and ${t.unitPrice} >= 0 and ${t.grossAmount} >= 0 and ${t.discountAmount} >= 0 and ${t.netAmount} = ${t.grossAmount} - ${t.discountAmount} and ${t.totalAmount} = ${t.netAmount} + ${t.taxAmount}`,
    ),
  ],
);

export const allocations = pgTable(
  "sale_item_batch_allocations",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    saleItemId: uuid("sale_item_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    quantity: qty("quantity").notNull(),
    unitCost: money("unit_cost_snapshot").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("allocations_business_id_uq").on(t.businessId, t.id),
    uniqueIndex("allocations_item_batch_uq").on(t.saleItemId, t.batchId),
    foreignKey({
      columns: [t.businessId, t.saleItemId],
      foreignColumns: [saleItems.businessId, saleItems.id],
    }),
    foreignKey({
      columns: [t.businessId, t.batchId],
      foreignColumns: [batches.businessId, batches.id],
    }),
    check(
      "allocations_quantity_check",
      sql`${t.quantity} > 0 and ${t.unitCost} >= 0`,
    ),
  ],
);

export const saleReturns = pgTable(
  "sale_returns",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    locationId: uuid("location_id").notNull(),
    orderId: uuid("order_id").notNull(),
    reason: text("reason").notNull(),
    approvedByUserId: uuid("approved_by_user_id")
      .notNull()
      .references(() => users.id),
    requestKey: text("request_key").notNull(),
    netAmount: money("net_reversal_amount").notNull(),
    requestHash: text("request_hash").notNull(),
    taxAmount: money("tax_reversal_amount").notNull(),
    totalAmount: money("total_reversal_amount").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("returns_business_id_uq").on(t.businessId, t.id),
    uniqueIndex("returns_business_request_uq").on(t.businessId, t.requestKey),
    foreignKey({
      columns: [t.businessId, t.locationId],
      foreignColumns: [locations.businessId, locations.id],
    }),
    foreignKey({
      columns: [t.businessId, t.orderId],
      foreignColumns: [orders.businessId, orders.id],
    }),
    check(
      "returns_total_check",
      sql`${t.netAmount} >= 0 and ${t.taxAmount} >= 0 and ${t.totalAmount} = ${t.netAmount} + ${t.taxAmount}`,
    ),
  ],
);

export const returnItems = pgTable(
  "sale_return_items",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    returnId: uuid("return_id").notNull(),
    saleItemId: uuid("sale_item_id").notNull(),
    allocationId: uuid("allocation_id").notNull(),
    quantity: qty("quantity").notNull(),
    restocked: qty("restocked_quantity").notNull().default("0"),
    disposed: qty("disposed_quantity").notNull().default("0"),
    netAmount: money("net_reversal_amount").notNull(),
    taxAmount: money("tax_reversal_amount").notNull(),
    totalAmount: money("total_reversal_amount").notNull(),
    unitCost: money("unit_cost_snapshot").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("return_items_business_id_uq").on(t.businessId, t.id),
    foreignKey({
      columns: [t.businessId, t.returnId],
      foreignColumns: [saleReturns.businessId, saleReturns.id],
    }),
    foreignKey({
      columns: [t.businessId, t.saleItemId],
      foreignColumns: [saleItems.businessId, saleItems.id],
    }),
    foreignKey({
      columns: [t.businessId, t.allocationId],
      foreignColumns: [allocations.businessId, allocations.id],
    }),
    check(
      "return_item_quantity_check",
      sql`${t.quantity} > 0 and ${t.restocked} >= 0 and ${t.disposed} >= 0 and ${t.restocked} + ${t.disposed} <= ${t.quantity}`,
    ),
  ],
);

export const wasteRecords = pgTable(
  "waste_records",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    locationId: uuid("location_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    productId: uuid("product_id").notNull(),
    returnItemId: uuid("sale_return_item_id"),
    origin: text("origin").notNull(),
    reason: text("reason").notNull(),
    notes: text("notes"),
    quantity: qty("quantity").notNull(),
    unitCost: money("unit_cost_snapshot").notNull(),
    totalCost: money("total_cost").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    operationKey: text("operation_key").notNull(),
    requestHash: text("request_hash"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("waste_business_id_uq").on(t.businessId, t.id),
    uniqueIndex("waste_business_operation_uq").on(t.businessId, t.operationKey),
    foreignKey({
      columns: [t.businessId, t.locationId],
      foreignColumns: [locations.businessId, locations.id],
    }),
    foreignKey({
      columns: [t.businessId, t.batchId],
      foreignColumns: [batches.businessId, batches.id],
    }),
    foreignKey({
      columns: [t.businessId, t.productId],
      foreignColumns: [products.businessId, products.id],
    }),
    foreignKey({
      columns: [t.businessId, t.returnItemId],
      foreignColumns: [returnItems.businessId, returnItems.id],
    }),
    index("waste_business_location_time_idx").on(
      t.businessId,
      t.locationId,
      t.occurredAt,
    ),
    check(
      "waste_positive_check",
      sql`${t.quantity} > 0 and ${t.unitCost} >= 0 and ${t.totalCost} >= 0`,
    ),
    check(
      "waste_origin_check",
      sql`${t.origin} in ('STOCK','CUSTOMER_RETURN')`,
    ),
    check(
      "waste_reason_check",
      sql`${t.reason} in ('expired','spoiled','damaged','overproduction','preparation_waste','other')`,
    ),
  ],
);

export const movements = pgTable(
  "inventory_movements",
  {
    id: id(),
    businessId: uuid("business_id")
      .notNull()
      .references(() => businesses.id),
    inventoryId: uuid("inventory_id").notNull(),
    batchId: uuid("batch_id").notNull(),
    type: text("type").notNull(),
    delta: qty("quantity_delta").notNull(),
    unitCost: money("unit_cost_snapshot").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    saleItemId: uuid("sale_item_id"),
    wasteRecordId: uuid("waste_record_id"),
    returnItemId: uuid("sale_return_item_id"),
    transferGroupId: uuid("transfer_group_id"),
    operationKey: text("operation_key").notNull(),
    movementKey: text("movement_key").notNull(),
    reason: text("reason"),
    provenanceReference: text("provenance_reference"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("movements_business_key_uq").on(t.businessId, t.movementKey),
    foreignKey({
      columns: [t.businessId, t.inventoryId],
      foreignColumns: [inventory.businessId, inventory.id],
    }),
    foreignKey({
      columns: [t.businessId, t.batchId],
      foreignColumns: [batches.businessId, batches.id],
    }),
    foreignKey({
      columns: [t.businessId, t.saleItemId],
      foreignColumns: [saleItems.businessId, saleItems.id],
    }),
    foreignKey({
      columns: [t.businessId, t.wasteRecordId],
      foreignColumns: [wasteRecords.businessId, wasteRecords.id],
    }),
    foreignKey({
      columns: [t.businessId, t.returnItemId],
      foreignColumns: [returnItems.businessId, returnItems.id],
    }),
    index("movements_inventory_time_idx").on(t.inventoryId, t.occurredAt),
    check("movements_nonzero_check", sql`${t.delta} <> 0`),
    check(
      "movements_type_check",
      sql`${t.type} in ('PURCHASE','SALE','WASTE','TRANSFER_OUT','TRANSFER_IN','RETURN','ADJUSTMENT')`,
    ),
  ],
);
