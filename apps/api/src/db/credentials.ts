import { and, eq, isNull } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type { EncryptedProviderCredential, ProviderCredentialInput } from '../credentials';
import * as schema from './schema';

type CredentialDatabase<TQueryResult extends PgQueryResultHKT> = PgDatabase<
  TQueryResult,
  typeof schema
>;
export type StoredProviderCredential = typeof schema.providerCredentials.$inferSelect;

export function createProviderCredentialRepository<TQueryResult extends PgQueryResultHKT>(
  database: CredentialDatabase<TQueryResult>,
) {
  return {
    async save(
      id: string,
      userId: string,
      input: Pick<ProviderCredentialInput, 'provider' | 'credentialType'>,
      encrypted: EncryptedProviderCredential,
    ): Promise<StoredProviderCredential> {
      const existing = await database.query.providerCredentials.findFirst({
        where: and(
          eq(schema.providerCredentials.userId, userId),
          eq(schema.providerCredentials.provider, input.provider),
        ),
      });
      const values = {
        credentialType: input.credentialType,
        ciphertext: encrypted.ciphertext,
        initializationVector: encrypted.initializationVector,
        keyVersion: encrypted.keyVersion,
        revokedAt: null,
        updatedAt: new Date(),
      };
      const result = existing
        ? await database
            .update(schema.providerCredentials)
            .set(values)
            .where(eq(schema.providerCredentials.id, existing.id))
            .returning()
        : await database
            .insert(schema.providerCredentials)
            .values({ id, userId, provider: input.provider, ...values })
            .returning();
      if (result[0]) return result[0];
      throw new Error('Credential write returned no credential.');
    },
    getActiveForUser(
      userId: string,
      provider: ProviderCredentialInput['provider'],
    ): Promise<StoredProviderCredential | undefined> {
      return database.query.providerCredentials.findFirst({
        where: and(
          eq(schema.providerCredentials.userId, userId),
          eq(schema.providerCredentials.provider, provider),
          isNull(schema.providerCredentials.revokedAt),
        ),
      });
    },
    async revoke(
      userId: string,
      provider: ProviderCredentialInput['provider'],
    ): Promise<StoredProviderCredential | undefined> {
      const result = await database
        .update(schema.providerCredentials)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(schema.providerCredentials.userId, userId),
            eq(schema.providerCredentials.provider, provider),
            isNull(schema.providerCredentials.revokedAt),
          ),
        )
        .returning();
      return result[0];
    },
  };
}
