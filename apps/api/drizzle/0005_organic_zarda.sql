CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"action" text NOT NULL,
	"previous_role" text,
	"new_role" text,
	"location_count" integer,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_action_check" CHECK ("audit_events"."action" in ('BUSINESS_CREATED','MEMBER_ADDED','ROLE_CHANGED','MEMBER_REVOKED','LOCATION_GRANTS_CHANGED'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_business_id_membership_id_business_memberships_business_id_id_fk" FOREIGN KEY ("business_id","membership_id") REFERENCES "public"."business_memberships"("business_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_business_time_idx" ON "audit_events" USING btree ("business_id","occurred_at");