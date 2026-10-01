CREATE UNIQUE INDEX "inventory_business_id_product_uq" ON "inventory" USING btree ("business_id","id","product_id");
--> statement-breakpoint
ALTER TABLE "inventory_batches" DROP CONSTRAINT "inventory_batches_business_id_inventory_id_inventory_business_id_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_business_id_inventory_id_product_id_inventory_business_id_id_product_id_fk" FOREIGN KEY ("business_id","inventory_id","product_id") REFERENCES "public"."inventory"("business_id","id","product_id") ON DELETE no action ON UPDATE no action;
