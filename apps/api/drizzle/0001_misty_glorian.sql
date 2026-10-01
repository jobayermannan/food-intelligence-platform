ALTER TABLE "businesses" ADD COLUMN "created_by_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "creation_key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_returns" ADD COLUMN "request_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "business_creator_key_uq" ON "businesses" USING btree ("created_by_user_id","creation_key");