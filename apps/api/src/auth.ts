import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { betterAuth } from 'better-auth/minimal';
import { ApiError } from './errors';
import { createDatabase } from './db/database';
import * as schema from './db/schema';
import type { ApiEnvironment } from './environment';

export type AuthenticatedActor = {
  userId: string;
  sessionId: string;
  deviceId?: string;
};

export interface Authenticator {
  authenticate(request: Request): Promise<AuthenticatedActor>;
}

export class RejectingAuthenticator implements Authenticator {
  async authenticate(): Promise<AuthenticatedActor> {
    throw new ApiError('authentication_required', 'Authentication is required.', 401);
  }
}

export type AuthRuntime = {
  authenticate: Authenticator['authenticate'];
  handle: (request: Request) => Promise<Response>;
  close: () => Promise<void>;
};

export function createAuthRuntime(input: {
  connectionString: string;
  environment: ApiEnvironment;
}): AuthRuntime {
  const connection = createDatabase(input.connectionString);
  const secret =
    input.environment.authSecret ?? 'development-only-navode-auth-secret-do-not-use-in-production';
  const auth = betterAuth({
    advanced: {
      useSecureCookies: input.environment.appEnvironment === 'production',
    },
    baseURL: input.environment.authBaseUrl,
    database: drizzleAdapter(connection.database, {
      provider: 'pg',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
    },
    secret,
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      freshAge: 60 * 30,
      modelName: 'authSessions',
      updateAge: 60 * 60 * 12,
    },
    trustedOrigins: [...input.environment.corsAllowedOrigins],
    user: {
      deleteUser: { enabled: true },
      modelName: 'users',
    },
    account: { modelName: 'authAccounts' },
    verification: { modelName: 'authVerifications' },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({ data: { ...user, id: crypto.randomUUID() } }),
        },
      },
    },
  });

  return {
    async authenticate(request) {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session)
        throw new ApiError('authentication_required', 'Authentication is required.', 401);
      return { sessionId: session.session.id, userId: session.user.id };
    },
    handle: (request) => auth.handler(request),
    close: connection.close,
  };
}
