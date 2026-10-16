ALTER TABLE "users" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX "businesses_demo_idx" ON "businesses" USING btree ("is_demo");
