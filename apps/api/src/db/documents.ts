import { and, eq, isNull } from 'drizzle-orm';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import type { PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

type SyncDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, typeof schema>;

export type SyncDocumentType = 'settings';
export type SyncDocument = typeof schema.syncDocuments.$inferSelect;

export function createSyncDocumentRepository<TQueryResult extends PgQueryResultHKT>(
  database: SyncDatabase<TQueryResult>,
) {
  return {
    async create(input: {
      id: string;
      userId: string;
      type: SyncDocumentType;
      payload: Record<string, unknown>;
    }): Promise<SyncDocument> {
      const documents = await database.insert(schema.syncDocuments).values(input).returning();
      const document = documents[0];

      if (!document) {
        throw new Error('Sync document insert returned no document.');
      }

      return document;
    },

    getActiveForUser(userId: string, type: SyncDocumentType): Promise<SyncDocument | undefined> {
      return database.query.syncDocuments.findFirst({
        where: and(
          eq(schema.syncDocuments.userId, userId),
          eq(schema.syncDocuments.type, type),
          isNull(schema.syncDocuments.deletedAt),
        ),
      });
    },
  };
}
