CREATE TABLE "cloud_backups" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "source_revision" bigint NOT NULL,
  "snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "credential_type" text NOT NULL,
  "key_version" text NOT NULL,
  "ciphertext" text NOT NULL,
  "initialization_vector" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "cloud_backups" ADD CONSTRAINT "cloud_backups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "cloud_backups_user_created_idx" ON "cloud_backups" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "provider_credentials_user_provider_unique" ON "provider_credentials" USING btree ("user_id","provider");
--> statement-breakpoint
CREATE INDEX "provider_credentials_user_active_idx" ON "provider_credentials" USING btree ("user_id","revoked_at");
