CREATE TYPE "public"."device_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."sync_document_type" AS ENUM('settings');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credential_references" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"secret_reference" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"label" text NOT NULL,
	"status" "device_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_mutation_keys" (
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"operation_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_mutation_keys_user_id_device_id_operation_id_pk" PRIMARY KEY("user_id","device_id","operation_id")
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"device_id" uuid,
	"event_type" text NOT NULL,
	"request_id" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "sync_document_type" NOT NULL,
	"current_revision" bigint DEFAULT 0 NOT NULL,
	"payload" jsonb NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_revisions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"revision" bigint NOT NULL,
	"operation_id" uuid NOT NULL,
	"base_revision" bigint NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credential_references" ADD CONSTRAINT "credential_references_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mutation_keys" ADD CONSTRAINT "document_mutation_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mutation_keys" ADD CONSTRAINT "document_mutation_keys_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_mutation_keys" ADD CONSTRAINT "document_mutation_keys_revision_id_sync_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."sync_revisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_documents" ADD CONSTRAINT "sync_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_revisions" ADD CONSTRAINT "sync_revisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_revisions" ADD CONSTRAINT "sync_revisions_document_id_sync_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."sync_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_revisions" ADD CONSTRAINT "sync_revisions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_unique" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credential_references_user_provider_unique" ON "credential_references" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "credential_references_user_id_idx" ON "credential_references" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "devices_user_installation_unique" ON "devices" USING btree ("user_id","installation_id");--> statement-breakpoint
CREATE INDEX "devices_user_status_idx" ON "devices" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "document_mutation_keys_revision_id_idx" ON "document_mutation_keys" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "security_events_user_created_idx" ON "security_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "security_events_device_created_idx" ON "security_events" USING btree ("device_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_documents_user_type_unique" ON "sync_documents" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "sync_documents_user_updated_idx" ON "sync_documents" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_revisions_document_revision_unique" ON "sync_revisions" USING btree ("document_id","revision");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_revisions_device_operation_unique" ON "sync_revisions" USING btree ("device_id","operation_id");--> statement-breakpoint
CREATE INDEX "sync_revisions_user_document_idx" ON "sync_revisions" USING btree ("user_id","document_id");