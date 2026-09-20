import { and, desc, eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

type BackupDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;
export type CloudBackup = typeof schema.cloudBackups.$inferSelect;

export function createCloudBackupRepository<TQueryResult extends PgQueryResultHKT>(
  database: BackupDatabase<TQueryResult>,
) {
  return {
    async create(input: {
      id: string;
      userId: string;
      sourceRevision: number;
      snapshot: Record<string, unknown>;
    }): Promise<CloudBackup> {
      const created = await database.insert(schema.cloudBackups).values(input).returning();
      if (created[0]) return created[0];
      throw new Error('Cloud backup insert returned no backup.');
    },
    listForUser(userId: string): Promise<CloudBackup[]> {
      return database.query.cloudBackups.findMany({
        where: eq(schema.cloudBackups.userId, userId),
        orderBy: [desc(schema.cloudBackups.createdAt)],
      });
    },
    getForUser(userId: string, backupId: string): Promise<CloudBackup | undefined> {
      return database.query.cloudBackups.findFirst({
        where: and(eq(schema.cloudBackups.id, backupId), eq(schema.cloudBackups.userId, userId)),
      });
    },
  };
}
