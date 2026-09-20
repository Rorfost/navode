import {
  bigint,
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const documentType = pgEnum('sync_document_type', ['settings']);
export const deviceStatus = pgEnum('device_status', ['active', 'revoked']);

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull();

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt,
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_accounts_provider_account_unique').on(table.providerId, table.accountId),
    index('auth_accounts_user_id_idx').on(table.userId),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('auth_sessions_user_expires_idx').on(table.userId, table.expiresAt)],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: uuid('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('auth_verifications_identifier_idx').on(table.identifier)],
);

export const devices = pgTable(
  'devices',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    installationId: uuid('installation_id').notNull(),
    label: text('label').notNull(),
    status: deviceStatus('status').default('active').notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt,
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('devices_user_installation_unique').on(table.userId, table.installationId),
    index('devices_user_status_idx').on(table.userId, table.status),
  ],
);

export const syncDocuments = pgTable(
  'sync_documents',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: documentType('type').notNull(),
    currentRevision: bigint('current_revision', { mode: 'number' }).default(0).notNull(),
    payload: jsonb('payload').notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sync_documents_user_type_unique').on(table.userId, table.type),
    index('sync_documents_user_updated_idx').on(table.userId, table.updatedAt),
  ],
);

export const syncRevisions = pgTable(
  'sync_revisions',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id')
      .notNull()
      .references(() => syncDocuments.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'restrict' }),
    revision: bigint('revision', { mode: 'number' }).notNull(),
    operationId: uuid('operation_id').notNull(),
    baseRevision: bigint('base_revision', { mode: 'number' }).notNull(),
    payload: jsonb('payload').notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex('sync_revisions_document_revision_unique').on(table.documentId, table.revision),
    uniqueIndex('sync_revisions_device_operation_unique').on(table.deviceId, table.operationId),
    index('sync_revisions_user_document_idx').on(table.userId, table.documentId),
  ],
);

export const credentialReferences = pgTable(
  'credential_references',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    secretReference: text('secret_reference').notNull(),
    createdAt,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('credential_references_user_provider_unique').on(table.userId, table.provider),
    index('credential_references_user_id_idx').on(table.userId),
  ],
);

export const cloudBackups = pgTable(
  'cloud_backups',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceRevision: bigint('source_revision', { mode: 'number' }).notNull(),
    snapshot: jsonb('snapshot').notNull(),
    createdAt,
  },
  (table) => [index('cloud_backups_user_created_idx').on(table.userId, table.createdAt)],
);

// This table deliberately contains ciphertext only. Provider secrets must never
// be placed in sync documents, credential_references, or application logs.
export const providerCredentials = pgTable(
  'provider_credentials',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    credentialType: text('credential_type').notNull(),
    keyVersion: text('key_version').notNull(),
    ciphertext: text('ciphertext').notNull(),
    initializationVector: text('initialization_vector').notNull(),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('provider_credentials_user_provider_unique').on(table.userId, table.provider),
    index('provider_credentials_user_active_idx').on(table.userId, table.revokedAt),
  ],
);

export const securityEvents = pgTable(
  'security_events',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    deviceId: uuid('device_id').references(() => devices.id, { onDelete: 'set null' }),
    eventType: text('event_type').notNull(),
    requestId: text('request_id').notNull(),
    metadata: jsonb('metadata').notNull(),
    createdAt,
  },
  (table) => [
    index('security_events_user_created_idx').on(table.userId, table.createdAt),
    index('security_events_device_created_idx').on(table.deviceId, table.createdAt),
  ],
);

export const documentMutationKeys = pgTable(
  'document_mutation_keys',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: uuid('device_id')
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    operationId: uuid('operation_id').notNull(),
    revisionId: uuid('revision_id')
      .notNull()
      .references(() => syncRevisions.id, { onDelete: 'cascade' }),
    createdAt,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.deviceId, table.operationId] }),
    index('document_mutation_keys_revision_id_idx').on(table.revisionId),
  ],
);
