import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createSyncDocumentRepository } from '../src/db/documents';
import * as schema from '../src/db/schema';

const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';
const documentA = '00000000-0000-4000-8000-000000000011';
const documentB = '00000000-0000-4000-8000-000000000012';

async function createIntegrationDatabase() {
  const client = new PGlite();
  const migrationUrl = new URL('../migrations/0001_awesome_mandrill.sql', import.meta.url);
  await client.exec(await readFile(fileURLToPath(migrationUrl), 'utf8'));
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

    await database.insert(schema.users).values([{ id: userA }, { id: userB }]);
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
});
