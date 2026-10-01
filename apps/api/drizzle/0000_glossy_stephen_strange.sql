CREATE TABLE "auth_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_purpose_check" CHECK ("auth_action_tokens"."purpose" in ('verify_email','reset_password'))
);
--> statement-breakpoint
CREATE TABLE "sale_item_batch_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_cost_snapshot" numeric(20, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "allocations_quantity_check" CHECK ("sale_item_batch_allocations"."quantity" > 0 and "sale_item_batch_allocations"."unit_cost_snapshot" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"lot_reference" text,
	"provenance_reference" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"expiry_status" text NOT NULL,
	"unit_cost" numeric(20, 6) NOT NULL,
	"remaining_quantity" numeric(18, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "batches_nonnegative_check" CHECK ("inventory_batches"."remaining_quantity" >= 0 and "inventory_batches"."unit_cost" >= 0),
	CONSTRAINT "batches_expiry_status_check" CHECK ("inventory_batches"."expiry_status" in ('known','unknown','nonperishable'))
);
--> statement-breakpoint
CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"currency" text NOT NULL,
	"default_tax_rate" numeric(8, 6) NOT NULL,
	"expiry_critical_hours" integer DEFAULT 24 NOT NULL,
	"expiry_warning_hours" integer DEFAULT 72 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "business_tax_check" CHECK ("businesses"."default_tax_rate" >= 0 and "businesses"."default_tax_rate" <= 1),
	CONSTRAINT "business_expiry_check" CHECK ("businesses"."expiry_critical_hours" > 0 and "businesses"."expiry_warning_hours" > "businesses"."expiry_critical_hours")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_id" uuid,
	"percent" numeric(6, 3) NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"explanation" text NOT NULL,
	"approved_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_percent_check" CHECK ("discounts"."percent" >= 0 and "discounts"."percent" <= 100 and "discounts"."valid_until" > "discounts"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"on_hand_quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"reorder_level" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_nonnegative_check" CHECK ("inventory"."on_hand_quantity" >= 0 and "inventory"."reorder_level" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_locations" (
	"business_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_locations_membership_id_location_id_pk" PRIMARY KEY("membership_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "business_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"inventory_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity_delta" numeric(18, 6) NOT NULL,
	"unit_cost_snapshot" numeric(20, 6) NOT NULL,
	"actor_user_id" uuid,
	"sale_item_id" uuid,
	"waste_record_id" uuid,
	"sale_return_item_id" uuid,
	"transfer_group_id" uuid,
	"operation_key" text NOT NULL,
	"movement_key" text NOT NULL,
	"reason" text,
	"provenance_reference" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movements_nonzero_check" CHECK ("inventory_movements"."quantity_delta" <> 0),
	CONSTRAINT "movements_type_check" CHECK ("inventory_movements"."type" in ('PURCHASE','SALE','WASTE','TRANSFER_OUT','TRANSFER_IN','RETURN','ADJUSTMENT'))
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"currency" text NOT NULL,
	"gross_amount" numeric(20, 6) NOT NULL,
	"discount_amount" numeric(20, 6) NOT NULL,
	"net_amount" numeric(20, 6) NOT NULL,
	"tax_amount" numeric(20, 6) NOT NULL,
	"total_amount" numeric(20, 6) NOT NULL,
	"request_key" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_total_check" CHECK ("orders"."gross_amount" >= 0 and "orders"."discount_amount" >= 0 and "orders"."net_amount" >= 0 and "orders"."tax_amount" >= 0 and "orders"."total_amount" >= 0 and "orders"."net_amount" = "orders"."gross_amount" - "orders"."discount_amount" and "orders"."total_amount" = "orders"."net_amount" + "orders"."tax_amount")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"base_unit" text NOT NULL,
	"package_definition" text,
	"selling_price" numeric(20, 6) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_check" CHECK ("products"."selling_price" >= 0),
	CONSTRAINT "products_unit_check" CHECK ("products"."base_unit" in ('piece','kg','gram','litre','ml','package'))
);
--> statement-breakpoint
CREATE TABLE "sale_return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"return_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"allocation_id" uuid NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"restocked_quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"disposed_quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"net_reversal_amount" numeric(20, 6) NOT NULL,
	"tax_reversal_amount" numeric(20, 6) NOT NULL,
	"total_reversal_amount" numeric(20, 6) NOT NULL,
	"unit_cost_snapshot" numeric(20, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "return_item_quantity_check" CHECK ("sale_return_items"."quantity" > 0 and "sale_return_items"."restocked_quantity" >= 0 and "sale_return_items"."disposed_quantity" >= 0 and "sale_return_items"."restocked_quantity" + "sale_return_items"."disposed_quantity" <= "sale_return_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"discount_id" uuid,
	"product_name_snapshot" text NOT NULL,
	"sku_snapshot" text NOT NULL,
	"base_unit_snapshot" text NOT NULL,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_price" numeric(20, 6) NOT NULL,
	"gross_amount" numeric(20, 6) NOT NULL,
	"discount_percent" numeric(6, 3) NOT NULL,
	"discount_amount" numeric(20, 6) NOT NULL,
	"net_amount" numeric(20, 6) NOT NULL,
	"tax_rate" numeric(8, 6) NOT NULL,
	"tax_amount" numeric(20, 6) NOT NULL,
	"total_amount" numeric(20, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sale_item_amount_check" CHECK ("sale_items"."quantity" > 0 and "sale_items"."unit_price" >= 0 and "sale_items"."gross_amount" >= 0 and "sale_items"."discount_amount" >= 0 and "sale_items"."net_amount" = "sale_items"."gross_amount" - "sale_items"."discount_amount" and "sale_items"."total_amount" = "sale_items"."net_amount" + "sale_items"."tax_amount")
);
--> statement-breakpoint
CREATE TABLE "sale_returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"approved_by_user_id" uuid NOT NULL,
	"request_key" text NOT NULL,
	"net_reversal_amount" numeric(20, 6) NOT NULL,
	"tax_reversal_amount" numeric(20, 6) NOT NULL,
	"total_reversal_amount" numeric(20, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "returns_total_check" CHECK ("sale_returns"."net_reversal_amount" >= 0 and "sale_returns"."tax_reversal_amount" >= 0 and "sale_returns"."total_reversal_amount" = "sale_returns"."net_reversal_amount" + "sale_returns"."tax_reversal_amount")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"token_family_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"replaced_by_session_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"external_reference" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"verified_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sale_return_item_id" uuid,
	"origin" text NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"quantity" numeric(18, 6) NOT NULL,
	"unit_cost_snapshot" numeric(20, 6) NOT NULL,
	"total_cost" numeric(20, 6) NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation_key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waste_positive_check" CHECK ("waste_records"."quantity" > 0 and "waste_records"."unit_cost_snapshot" >= 0 and "waste_records"."total_cost" >= 0),
	CONSTRAINT "waste_origin_check" CHECK ("waste_records"."origin" in ('STOCK','CUSTOMER_RETURN')),
	CONSTRAINT "waste_reason_check" CHECK ("waste_records"."reason" in ('expired','spoiled','damaged','overproduction','preparation_waste','other'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "action_token_hash_uq" ON "auth_action_tokens" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "allocations_business_id_uq" ON "sale_item_batch_allocations" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "allocations_item_batch_uq" ON "sale_item_batch_allocations" USING btree ("sale_item_id","batch_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "batches_business_id_uq" ON "inventory_batches" USING btree ("business_id","id");
--> statement-breakpoint
CREATE INDEX "batches_inventory_expiry_idx" ON "inventory_batches" USING btree ("inventory_id","expires_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_business_name_uq" ON "categories" USING btree ("business_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX "categories_business_id_uq" ON "categories" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_business_id_uq" ON "discounts" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_business_location_product_uq" ON "inventory" USING btree ("business_id","location_id","product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_business_id_uq" ON "inventory" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "locations_business_code_uq" ON "inventory_locations" USING btree ("business_id","code");
--> statement-breakpoint
CREATE UNIQUE INDEX "locations_business_id_uq" ON "inventory_locations" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_business_user_uq" ON "business_memberships" USING btree ("business_id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_business_id_uq" ON "business_memberships" USING btree ("business_id","id");
--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "business_memberships" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "movements_business_key_uq" ON "inventory_movements" USING btree ("business_id","movement_key");
--> statement-breakpoint
CREATE INDEX "movements_inventory_time_idx" ON "inventory_movements" USING btree ("inventory_id","occurred_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_id_uq" ON "orders" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_number_uq" ON "orders" USING btree ("business_id","order_number");
--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_request_uq" ON "orders" USING btree ("business_id","request_key");
--> statement-breakpoint
CREATE INDEX "orders_business_location_time_idx" ON "orders" USING btree ("business_id","location_id","completed_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_sku_uq" ON "products" USING btree ("business_id","sku");
--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_id_uq" ON "products" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "return_items_business_id_uq" ON "sale_return_items" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_business_id_uq" ON "sale_items" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "returns_business_id_uq" ON "sale_returns" USING btree ("business_id","id");
--> statement-breakpoint
CREATE UNIQUE INDEX "returns_business_request_uq" ON "sale_returns" USING btree ("business_id","request_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_hash_uq" ON "auth_sessions" USING btree ("refresh_token_hash");
--> statement-breakpoint
CREATE INDEX "sessions_user_family_idx" ON "auth_sessions" USING btree ("user_id","token_family_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_business_id_uq" ON "suppliers" USING btree ("business_id","id");
--> statement-breakpoint
CREATE INDEX "suppliers_business_idx" ON "suppliers" USING btree ("business_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");
--> statement-breakpoint
CREATE UNIQUE INDEX "waste_business_operation_uq" ON "waste_records" USING btree ("business_id","operation_key");
--> statement-breakpoint
CREATE UNIQUE INDEX "waste_business_id_uq" ON "waste_records" USING btree ("business_id","id");
--> statement-breakpoint
CREATE INDEX "waste_business_location_time_idx" ON "waste_records" USING btree ("business_id","location_id","occurred_at");
--> statement-breakpoint
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_item_batch_allocations" ADD CONSTRAINT "sale_item_batch_allocations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_item_batch_allocations" ADD CONSTRAINT "sale_item_batch_allocations_business_id_sale_item_id_sale_items_business_id_id_fk" FOREIGN KEY ("business_id","sale_item_id") REFERENCES "public"."sale_items"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_item_batch_allocations" ADD CONSTRAINT "sale_item_batch_allocations_business_id_batch_id_inventory_batches_business_id_id_fk" FOREIGN KEY ("business_id","batch_id") REFERENCES "public"."inventory_batches"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_business_id_inventory_id_inventory_business_id_id_fk" FOREIGN KEY ("business_id","inventory_id") REFERENCES "public"."inventory"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_business_id_product_id_products_business_id_id_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_business_id_supplier_id_suppliers_business_id_id_fk" FOREIGN KEY ("business_id","supplier_id") REFERENCES "public"."suppliers"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_business_id_product_id_products_business_id_id_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_business_id_batch_id_inventory_batches_business_id_id_fk" FOREIGN KEY ("business_id","batch_id") REFERENCES "public"."inventory_batches"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_business_id_location_id_inventory_locations_business_id_id_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "public"."inventory_locations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_business_id_product_id_products_business_id_id_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "membership_locations" ADD CONSTRAINT "membership_locations_business_id_membership_id_business_memberships_business_id_id_fk" FOREIGN KEY ("business_id","membership_id") REFERENCES "public"."business_memberships"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "membership_locations" ADD CONSTRAINT "membership_locations_business_id_location_id_inventory_locations_business_id_id_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "public"."inventory_locations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "business_memberships" ADD CONSTRAINT "business_memberships_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_inventory_id_inventory_business_id_id_fk" FOREIGN KEY ("business_id","inventory_id") REFERENCES "public"."inventory"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_batch_id_inventory_batches_business_id_id_fk" FOREIGN KEY ("business_id","batch_id") REFERENCES "public"."inventory_batches"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_sale_item_id_sale_items_business_id_id_fk" FOREIGN KEY ("business_id","sale_item_id") REFERENCES "public"."sale_items"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_waste_record_id_waste_records_business_id_id_fk" FOREIGN KEY ("business_id","waste_record_id") REFERENCES "public"."waste_records"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_sale_return_item_id_sale_return_items_business_id_id_fk" FOREIGN KEY ("business_id","sale_return_item_id") REFERENCES "public"."sale_return_items"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_business_id_location_id_inventory_locations_business_id_id_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "public"."inventory_locations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_category_id_categories_business_id_id_fk" FOREIGN KEY ("business_id","category_id") REFERENCES "public"."categories"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_business_id_return_id_sale_returns_business_id_id_fk" FOREIGN KEY ("business_id","return_id") REFERENCES "public"."sale_returns"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_business_id_sale_item_id_sale_items_business_id_id_fk" FOREIGN KEY ("business_id","sale_item_id") REFERENCES "public"."sale_items"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_return_items" ADD CONSTRAINT "sale_return_items_business_id_allocation_id_sale_item_batch_allocations_business_id_id_fk" FOREIGN KEY ("business_id","allocation_id") REFERENCES "public"."sale_item_batch_allocations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_order_id_orders_business_id_id_fk" FOREIGN KEY ("business_id","order_id") REFERENCES "public"."orders"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_product_id_products_business_id_id_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_business_id_discount_id_discounts_business_id_id_fk" FOREIGN KEY ("business_id","discount_id") REFERENCES "public"."discounts"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_business_id_location_id_inventory_locations_business_id_id_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "public"."inventory_locations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sale_returns" ADD CONSTRAINT "sale_returns_business_id_order_id_orders_business_id_id_fk" FOREIGN KEY ("business_id","order_id") REFERENCES "public"."orders"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_business_id_location_id_inventory_locations_business_id_id_fk" FOREIGN KEY ("business_id","location_id") REFERENCES "public"."inventory_locations"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_business_id_batch_id_inventory_batches_business_id_id_fk" FOREIGN KEY ("business_id","batch_id") REFERENCES "public"."inventory_batches"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_business_id_product_id_products_business_id_id_fk" FOREIGN KEY ("business_id","product_id") REFERENCES "public"."products"("business_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_business_id_sale_return_item_id_sale_return_items_business_id_id_fk" FOREIGN KEY ("business_id","sale_return_item_id") REFERENCES "public"."sale_return_items"("business_id","id") ON DELETE no action ON UPDATE no action;
