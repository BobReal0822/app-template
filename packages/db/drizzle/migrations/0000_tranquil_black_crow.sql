CREATE TABLE "users" (
	"uid" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '1' NOT NULL,
	"credits" integer DEFAULT 15 NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"plan_credits" integer DEFAULT 0 NOT NULL,
	"plan_expired_at" timestamp with time zone,
	"subscription_cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"subscription_billing_cycle" text,
	"stripe_subscription_id" text,
	"next_yearly_credit_grant_at" timestamp with time zone,
	"yearly_credit_grant_anchor_day" integer,
	"stripe_customer_id" text,
	"next_free_credit_grant_at" timestamp with time zone,
	"free_credit_grant_anchor_day" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_credits_non_negative" CHECK ("users"."credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "credit_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"subscription_id" text NOT NULL,
	"plan_code" text NOT NULL,
	"billing_cycle" text NOT NULL,
	"amount" integer NOT NULL,
	"grant_month" text NOT NULL,
	"trigger_source" text NOT NULL,
	"trigger_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"ip" text NOT NULL,
	"user_agent" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'unknown' NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"content" text NOT NULL,
	"meta" text DEFAULT '' NOT NULL,
	"attrs" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"expire_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uid" text,
	"event" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_registrations" (
	"email" text PRIMARY KEY NOT NULL,
	"otp_hash" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_plan_idx" ON "users" USING btree ("plan");--> statement-breakpoint
CREATE INDEX "users_plan_next_free_grant_idx" ON "users" USING btree ("plan","next_free_credit_grant_at");--> statement-breakpoint
CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_grants_uid_idx" ON "credit_grants" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "credit_grants_subscription_id_idx" ON "credit_grants" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "credit_grants_grant_month_idx" ON "credit_grants" USING btree ("grant_month");--> statement-breakpoint
CREATE INDEX "credit_grants_trigger_source_idx" ON "credit_grants" USING btree ("trigger_source");--> statement-breakpoint
CREATE INDEX "credit_grants_created_at_idx" ON "credit_grants" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "login_logs_uid_idx" ON "login_logs" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "login_logs_created_at_idx" ON "login_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "login_logs_uid_created_at_idx" ON "login_logs" USING btree ("uid","created_at");--> statement-breakpoint
CREATE INDEX "feedbacks_uid_idx" ON "feedbacks" USING btree ("uid");--> statement-breakpoint
CREATE INDEX "feedbacks_created_at_idx" ON "feedbacks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_idempotency_keys_expire_at" ON "idempotency_keys" USING btree ("expire_at");--> statement-breakpoint
CREATE INDEX "idx_auth_audit_logs_uid" ON "auth_audit_logs" USING btree ("uid","created_at");--> statement-breakpoint
CREATE INDEX "idx_pending_registrations_expires_at" ON "pending_registrations" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_account_provider_account_unique" ON "auth_account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_session_token_unique" ON "auth_session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_expires_at_idx" ON "auth_session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_user_email_unique" ON "auth_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "auth_verification_expires_at_idx" ON "auth_verification" USING btree ("expires_at");