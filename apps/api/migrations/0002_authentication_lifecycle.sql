DROP INDEX IF EXISTS "auth_accounts_provider_account_unique";
ALTER TABLE "auth_accounts" DROP COLUMN "provider";
ALTER TABLE "auth_accounts" DROP COLUMN "provider_account_id";
ALTER TABLE "auth_accounts" ADD COLUMN "account_id" text NOT NULL;
ALTER TABLE "auth_accounts" ADD COLUMN "provider_id" text NOT NULL;
ALTER TABLE "auth_accounts" ADD COLUMN "access_token" text;
ALTER TABLE "auth_accounts" ADD COLUMN "refresh_token" text;
ALTER TABLE "auth_accounts" ADD COLUMN "id_token" text;
ALTER TABLE "auth_accounts" ADD COLUMN "access_token_expires_at" timestamp with time zone;
ALTER TABLE "auth_accounts" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;
ALTER TABLE "auth_accounts" ADD COLUMN "scope" text;
ALTER TABLE "auth_accounts" ADD COLUMN "password" text;
ALTER TABLE "auth_accounts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider_id", "account_id");

ALTER TABLE "users" ADD COLUMN "name" text NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email" text NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN "image" text;
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");

CREATE TABLE "auth_sessions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "auth_sessions_token_unique" ON "auth_sessions" USING btree ("token");
CREATE INDEX "auth_sessions_user_expires_idx" ON "auth_sessions" USING btree ("user_id", "expires_at");

CREATE TABLE "auth_verifications" (
  "id" uuid PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications" USING btree ("identifier");
