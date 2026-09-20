import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createSyncDocumentRepository } from '../src/db/documents';
import { createCloudBackupRepository } from '../src/db/backups';
import { createDeviceRepository } from '../src/db/devices';
import {
  createCredentialKeyring,
  decryptProviderCredential,
  encryptProviderCredential,
} from '../src/credentials';
import { createProviderCredentialRepository } from '../src/db/credentials';
import { createSecurityEventRepository } from '../src/db/security-events';
import { createServerSyncRepository } from '../src/db/sync';
import * as schema from '../src/db/schema';

const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const documentA = '00000000-0000-4000-8000-000000000011';
const documentB = '00000000-0000-4000-8000-000000000012';

async function createIntegrationDatabase() {
  const client = new PGlite();
  for (const migration of [
    '0001_awesome_mandrill.sql',
    '0002_authentication_lifecycle.sql',
    '0003_backup_and_credentials.sql',
    '0004_account_deletion_audit_cleanup.sql',
  ]) {
    const migrationUrl = new URL(`../migrations/${migration}`, import.meta.url);
    await client.exec(await readFile(fileURLToPath(migrationUrl), 'utf8'));
  }
  return { client, database: drizzle(client, { schema }) };
}

describe('PostgreSQL sync foundation', () => {
  const clients: PGlite[] = [];

  afterEach(async () => {
    await Promise.all(clients.splice(0).map((client) => client.close()));
  });

  it('isolates documents by the authenticated owner query', async () => {
    const { client, database } = await createIntegrationDatabase();
    clients.push(client);
    const documents = createSyncDocumentRepository(database);

    await database.insert(schema.users).values([
      { id: userA, name: 'User A', email: 'user-a@example.test' },
      { id: userB, name: 'User B', email: 'user-b@example.test' },
    ]);
    await documents.create({
      id: documentA,
      userId: userA,
      type: 'settings',
      payload: { theme: 'dark' },
    });
    await documents.create({
      id: documentB,
      userId: userB,
      type: 'settings',
      payload: { theme: 'light' },
    });

    await expect(documents.getActiveForUser(userA, 'settings')).resolves.toMatchObject({
      id: documentA,
      userId: userA,
      payload: { theme: 'dark' },
    });
    await expect(documents.getActiveForUser(userB, 'settings')).resolves.toMatchObject({
      id: documentB,
      userId: userB,
      payload: { theme: 'light' },
    });
  });

  it('limits device and cloud backup operations to their authenticated owner', async () => {
    const { client, database } = await createIntegrationDatabase();
    clients.push(client);
    const devices = createDeviceRepository(database);
    const backups = createCloudBackupRepository(database);
    await database.insert(schema.users).values([
      { id: userA, name: 'User A', email: 'user-a@example.test' },
      { id: userB, name: 'User B', email: 'user-b@example.test' },
    ]);

    const device = await devices.register({
      id: '00000000-0000-4000-8000-000000000021',
      installationId: '00000000-0000-4000-8000-000000000022',
      label: 'Work laptop',
      userId: userA,
    });
    await backups.create({
      id: '00000000-0000-4000-8000-000000000023',
      sourceRevision: 2,
      snapshot: { schemaVersion: 9 },
      userId: userA,
    });

    await expect(devices.rename(userB, device.id, 'Stolen name')).resolves.toBeUndefined();
    await expect(devices.revoke(userB, device.id)).resolves.toBeUndefined();
    await expect(
      backups.getForUser(userB, '00000000-0000-4000-8000-000000000023'),
    ).resolves.toBeUndefined();
    await expect(devices.getActiveForUser(userA, device.id)).resolves.toMatchObject({
      label: 'Work laptop',
      status: 'active',
    });
  });

  it('encrypts provider credentials and makes revocation and cross-user reads fail closed', async () => {
    const { client, database } = await createIntegrationDatabase();
    clients.push(client);
    await database.insert(schema.users).values([
      { id: userA, name: 'User A', email: 'user-a@example.test' },
      { id: userB, name: 'User B', email: 'user-b@example.test' },
    ]);
    const keyring = await createCredentialKeyring('v1:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    const input = {
      provider: 'github' as const,
      credentialType: 'oauth_refresh_token' as const,
      refreshToken: 'refresh-token-not-for-logs',
    };
    const encrypted = await encryptProviderCredential(keyring, userA, input);
    const credentials = createProviderCredentialRepository(database);
    await credentials.save('00000000-0000-4000-8000-000000000024', userA, input, encrypted);

    const stored = await credentials.getActiveForUser(userA, 'github');
    expect(stored?.ciphertext).not.toContain(input.refreshToken);
    await expect(
      decryptProviderCredential(keyring, userA, input, {
        ciphertext: stored!.ciphertext,
        initializationVector: stored!.initializationVector,
        keyVersion: stored!.keyVersion,
      }),
    ).resolves.toBe(input.refreshToken);
    await expect(credentials.getActiveForUser(userB, 'github')).resolves.toBeUndefined();
    await credentials.revoke(userA, 'github');
    await expect(credentials.getActiveForUser(userA, 'github')).resolves.toBeUndefined();
  });

  it('removes account-owned backups, credentials, devices, and audit events on deletion', async () => {
    const { client, database } = await createIntegrationDatabase();
    clients.push(client);
    await database.insert(schema.users).values({
      id: userA,
      name: 'User A',
      email: 'user-a@example.test',
    });
    const devices = createDeviceRepository(database);
    const device = await devices.register({
      id: '00000000-0000-4000-8000-000000000025',
      installationId: '00000000-0000-4000-8000-000000000026',
      label: 'Work laptop',
      userId: userA,
    });
    await createCloudBackupRepository(database).create({
      id: '00000000-0000-4000-8000-000000000027',
      sourceRevision: 3,
      snapshot: { schemaVersion: 9 },
      userId: userA,
    });
    await createSecurityEventRepository(database).record({
      deviceId: device.id,
      eventType: 'device_revoked',
      id: '00000000-0000-4000-8000-000000000028',
      metadata: { source: 'test' },
      requestId: 'request-id-for-delete-test',
      userId: userA,
    });

    await database.delete(schema.users).where(eq(schema.users.id, userA));

    await expect(devices.listForUser(userA)).resolves.toEqual([]);
    await expect(createCloudBackupRepository(database).listForUser(userA)).resolves.toEqual([]);
    await expect(createSecurityEventRepository(database).listForUser(userA)).resolves.toEqual([]);
  });

  it('applies cross-device operations once and rejects a stale revision', async () => {
    const { client, database } = await createIntegrationDatabase();
    clients.push(client);
    await database.insert(schema.users).values([
      { id: userA, name: 'User A', email: 'user-a@example.test' },
      { id: userB, name: 'User B', email: 'user-b@example.test' },
    ]);
    const devices = createDeviceRepository(database);
    const deviceA = await devices.register({
      id: '00000000-0000-4000-8000-000000000031',
      installationId: '00000000-0000-4000-8000-000000000032',
      label: 'Laptop',
      userId: userA,
    });
    const deviceB = await devices.register({
      id: '00000000-0000-4000-8000-000000000033',
      installationId: '00000000-0000-4000-8000-000000000034',
      label: 'Phone',
      userId: userA,
    });
    const sync = createServerSyncRepository(database);
    const first = {
      baseRevision: 0,
      deviceId: deviceA.id,
      documentId: '00000000-0000-4000-8000-000000000035',
      operationId: '00000000-0000-4000-8000-000000000036',
      payload: { entities: { 'quick-link:docs': { title: 'Docs' } } },
      revisionId: '00000000-0000-4000-8000-000000000037',
      userId: userA,
    };

    await expect(sync.applySettingsOperation(first)).resolves.toEqual({
      kind: 'applied',
      revision: 1,
    });
    await expect(sync.applySettingsOperation(first)).resolves.toEqual({
      kind: 'duplicate',
      revision: 1,
    });
    await expect(
      sync.applySettingsOperation({
        ...first,
        deviceId: deviceB.id,
        operationId: '00000000-0000-4000-8000-000000000038',
        revisionId: '00000000-0000-4000-8000-000000000039',
      }),
    ).resolves.toEqual({ currentRevision: 1, kind: 'conflict' });
    await expect(sync.getSettings(userB)).resolves.toBeUndefined();
  });
});
