import { and, desc, eq, isNull } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

type DeviceDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;
export type Device = typeof schema.devices.$inferSelect;

export function createDeviceRepository<TQueryResult extends PgQueryResultHKT>(
  database: DeviceDatabase<TQueryResult>,
) {
  return {
    listForUser(userId: string): Promise<Device[]> {
      return database.query.devices.findMany({
        where: eq(schema.devices.userId, userId),
        orderBy: [desc(schema.devices.lastSeenAt), desc(schema.devices.createdAt)],
      });
    },

    async register(input: {
      id: string;
      userId: string;
      installationId: string;
      label: string;
    }): Promise<Device> {
      const existing = await database.query.devices.findFirst({
        where: and(
          eq(schema.devices.userId, input.userId),
          eq(schema.devices.installationId, input.installationId),
        ),
      });
      const now = new Date();
      if (existing) {
        const updated = await database
          .update(schema.devices)
          .set({ label: input.label, lastSeenAt: now, revokedAt: null, status: 'active' })
          .where(eq(schema.devices.id, existing.id))
          .returning();
        if (updated[0]) return updated[0];
        throw new Error('Device update returned no device.');
      }
      const created = await database
        .insert(schema.devices)
        .values({ ...input, lastSeenAt: now })
        .returning();
      if (created[0]) return created[0];
      throw new Error('Device insert returned no device.');
    },

    async rename(userId: string, deviceId: string, label: string): Promise<Device | undefined> {
      const updated = await database
        .update(schema.devices)
        .set({ label })
        .where(and(eq(schema.devices.id, deviceId), eq(schema.devices.userId, userId)))
        .returning();
      return updated[0];
    },

    async revoke(userId: string, deviceId: string): Promise<Device | undefined> {
      const updated = await database
        .update(schema.devices)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(
            eq(schema.devices.id, deviceId),
            eq(schema.devices.userId, userId),
            eq(schema.devices.status, 'active'),
          ),
        )
        .returning();
      return updated[0];
    },

    getActiveForUser(userId: string, deviceId: string): Promise<Device | undefined> {
      return database.query.devices.findFirst({
        where: and(
          eq(schema.devices.id, deviceId),
          eq(schema.devices.userId, userId),
          eq(schema.devices.status, 'active'),
          isNull(schema.devices.revokedAt),
        ),
      });
    },
  };
}
