import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';

export type NavodeDatabase = ReturnType<typeof createDatabase>['database'];

export type DatabaseConnection = {
  database: ReturnType<typeof drizzle<typeof schema>>;
  close: () => Promise<void>;
};

export function createDatabase(connectionString: string): DatabaseConnection {
  const client = postgres(connectionString, {
    fetch_types: false,
    max: 5,
    prepare: true,
  });

  return {
    database: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  };
}

export async function verifyDatabaseConnection(connectionString: string): Promise<boolean> {
  const connection = createDatabase(connectionString);

  try {
    await connection.database.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  } finally {
    await connection.close();
  }
}
