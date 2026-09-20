import { desc, eq } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

type SecurityEventDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;
export type SecurityEvent = typeof schema.securityEvents.$inferSelect;

export function createSecurityEventRepository<TQueryResult extends PgQueryResultHKT>(
  database: SecurityEventDatabase<TQueryResult>,
) {
  return {
    async record(input: {
      id: string;
      userId: string;
      deviceId?: string;
      eventType: 'device_revoked';
      requestId: string;
      metadata: Record<string, string>;
    }): Promise<SecurityEvent> {
      const created = await database.insert(schema.securityEvents).values(input).returning();
      if (created[0]) return created[0];
      throw new Error('Security event insert returned no event.');
    },
    listForUser(userId: string, limit = 50): Promise<SecurityEvent[]> {
      return database.query.securityEvents.findMany({
        where: eq(schema.securityEvents.userId, userId),
        orderBy: [desc(schema.securityEvents.createdAt)],
        limit,
      });
    },
  };
}
