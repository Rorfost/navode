import { and, eq, isNull } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

type SyncDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<TQueryResult, typeof schema>;

export type SyncApplyResult =
  | { kind: 'applied'; revision: number }
  | { kind: 'duplicate'; revision: number }
  | { kind: 'conflict'; currentRevision: number };

export function createServerSyncRepository<TQueryResult extends PgQueryResultHKT>(
  database: SyncDatabase<TQueryResult>,
) {
  return {
    getSettings(userId: string) {
      return database.query.syncDocuments.findFirst({
        where: and(
          eq(schema.syncDocuments.userId, userId),
          eq(schema.syncDocuments.type, 'settings'),
          isNull(schema.syncDocuments.deletedAt),
        ),
      });
    },

    async applySettingsOperation(input: {
      baseRevision: number;
      deviceId: string;
      documentId: string;
      operationId: string;
      payload: Record<string, unknown>;
      revisionId: string;
      userId: string;
    }): Promise<SyncApplyResult> {
      return database.transaction(async (transaction) => {
        const device = await transaction.query.devices.findFirst({
          where: and(
            eq(schema.devices.id, input.deviceId),
            eq(schema.devices.userId, input.userId),
            eq(schema.devices.status, 'active'),
            isNull(schema.devices.revokedAt),
          ),
        });
        if (!device) return { kind: 'conflict', currentRevision: -1 };

        const duplicate = await transaction.query.documentMutationKeys.findFirst({
          where: and(
            eq(schema.documentMutationKeys.userId, input.userId),
            eq(schema.documentMutationKeys.deviceId, input.deviceId),
            eq(schema.documentMutationKeys.operationId, input.operationId),
          ),
        });
        if (duplicate) {
          const revision = await transaction.query.syncRevisions.findFirst({
            where: eq(schema.syncRevisions.id, duplicate.revisionId),
          });
          if (!revision) throw new Error('Recorded sync mutation has no revision.');
          return { kind: 'duplicate', revision: revision.revision };
        }

        const document = await transaction.query.syncDocuments.findFirst({
          where: and(
            eq(schema.syncDocuments.userId, input.userId),
            eq(schema.syncDocuments.type, 'settings'),
            isNull(schema.syncDocuments.deletedAt),
          ),
        });
        const currentRevision = document?.currentRevision ?? 0;
        if (currentRevision !== input.baseRevision) return { kind: 'conflict', currentRevision };

        const nextRevision = currentRevision + 1;
        if (document) {
          const updated = await transaction
            .update(schema.syncDocuments)
            .set({ currentRevision: nextRevision, payload: input.payload, updatedAt: new Date() })
            .where(
              and(
                eq(schema.syncDocuments.id, document.id),
                eq(schema.syncDocuments.currentRevision, currentRevision),
              ),
            )
            .returning({ id: schema.syncDocuments.id });
          if (!updated[0]) return { kind: 'conflict', currentRevision };
        } else {
          await transaction.insert(schema.syncDocuments).values({
            currentRevision: nextRevision,
            id: input.documentId,
            payload: input.payload,
            type: 'settings',
            userId: input.userId,
          });
        }

        const documentId = document?.id ?? input.documentId;
        await transaction.insert(schema.syncRevisions).values({
          baseRevision: input.baseRevision,
          deviceId: input.deviceId,
          documentId,
          id: input.revisionId,
          operationId: input.operationId,
          payload: input.payload,
          revision: nextRevision,
          userId: input.userId,
        });
        await transaction.insert(schema.documentMutationKeys).values({
          deviceId: input.deviceId,
          operationId: input.operationId,
          revisionId: input.revisionId,
          userId: input.userId,
        });
        return { kind: 'applied', revision: nextRevision };
      });
    },
  };
}
