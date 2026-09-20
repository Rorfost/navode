import { Hono } from 'hono';
import { NAVODE_VERSION } from '@navode/config';
import { createAuthRuntime, RejectingAuthenticator, type Authenticator } from './auth';
import { createCloudBackupRepository } from './db/backups';
import { createDatabase, verifyDatabaseConnection } from './db/database';
import { createDeviceRepository } from './db/devices';
import { createSecurityEventRepository } from './db/security-events';
import { createServerSyncRepository } from './db/sync';
import { parseEnvironment, type ApiEnvironment } from './environment';
import { ApiError } from './errors';
import { consoleLogger, type ApiLogger } from './logging';
import { allowAllRateLimiter, type RateLimiter } from './rate-limit';
import { z } from 'zod';

type HyperdriveBinding = { connectionString: string };

type Bindings = {
  APP_ENV?: string;
  APP_VERSION?: string;
  AUTH_BASE_URL?: string;
  AUTH_SECRET?: string;
  CREDENTIAL_ENCRYPTION_KEYS?: string;
  CORS_ALLOWED_ORIGINS?: string;
  HYPERDRIVE?: HyperdriveBinding;
};

type Variables = { requestId: string };

export type ApiDependencies = {
  authenticator?: Authenticator;
  databaseReady?: () => Promise<boolean>;
  environment?: ApiEnvironment;
  logger?: ApiLogger;
  rateLimiter?: RateLimiter;
};

const deviceInputSchema = z.object({
  installationId: z.uuid(),
  label: z.string().trim().min(1).max(80),
});
const renameDeviceSchema = z.object({ label: z.string().trim().min(1).max(80) });
const cloudBackupSchema = z.object({
  sourceRevision: z.number().int().nonnegative(),
  snapshot: z.record(z.string(), z.unknown()),
});
const restoreSchema = z.object({ confirmation: z.literal('REPLACE_LOCAL_DATA') });
const syncOperationSchema = z.object({
  baseRevision: z.number().int().nonnegative(),
  deviceId: z.uuid(),
  operationId: z.uuid(),
  payload: z.record(z.string(), z.unknown()),
});

function requestIdFrom(request: Request): string {
  const suppliedId = request.headers.get('x-request-id');
  return suppliedId && /^[a-zA-Z0-9_-]{8,100}$/.test(suppliedId) ? suppliedId : crypto.randomUUID();
}

function clientKey(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? 'anonymous';
}

function originHeaders(origin: string): Headers {
  return new Headers({
    'access-control-allow-headers': 'authorization, content-type, x-request-id',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-origin': origin,
    'access-control-max-age': '600',
    vary: 'Origin',
  });
}

function defaultReadiness(bindings: Bindings): Promise<boolean> {
  return bindings.HYPERDRIVE
    ? verifyDatabaseConnection(bindings.HYPERDRIVE.connectionString)
    : Promise.resolve(false);
}

function createRuntimeAuth(bindings: Bindings, environment: ApiEnvironment) {
  if (!bindings.HYPERDRIVE) {
    throw new ApiError('database_unavailable', 'Authentication is not configured.', 503);
  }
  return createAuthRuntime({ connectionString: bindings.HYPERDRIVE.connectionString, environment });
}

function environmentBindings(bindings: Bindings): Record<string, string | undefined> {
  return {
    APP_ENV: bindings.APP_ENV,
    APP_VERSION: bindings.APP_VERSION,
    CORS_ALLOWED_ORIGINS: bindings.CORS_ALLOWED_ORIGINS,
    AUTH_BASE_URL: bindings.AUTH_BASE_URL,
    AUTH_SECRET: bindings.AUTH_SECRET,
    CREDENTIAL_ENCRYPTION_KEYS: bindings.CREDENTIAL_ENCRYPTION_KEYS,
  };
}

export function createApp(dependencies: ApiDependencies = {}) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  const logger = dependencies.logger ?? consoleLogger;
  const rateLimiter = dependencies.rateLimiter ?? allowAllRateLimiter;

  async function authenticate(context: {
    env: Bindings;
    req: { raw: Request };
  }): Promise<Awaited<ReturnType<Authenticator['authenticate']>>> {
    if (dependencies.authenticator || !context.env?.HYPERDRIVE) {
      return (dependencies.authenticator ?? new RejectingAuthenticator()).authenticate(
        context.req.raw,
      );
    }
    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    const runtime = createRuntimeAuth(context.env, environment);
    try {
      return await runtime.authenticate(context.req.raw);
    } finally {
      await runtime.close();
    }
  }

  async function withDatabase<T>(
    context: { env: Bindings },
    operation: (database: ReturnType<typeof createDatabase>['database']) => Promise<T>,
  ): Promise<T> {
    if (!context.env?.HYPERDRIVE) {
      throw new ApiError('database_unavailable', 'Database is unavailable.', 503);
    }
    const connection = createDatabase(context.env.HYPERDRIVE.connectionString);
    try {
      return await operation(connection.database);
    } finally {
      await connection.close();
    }
  }

  app.use('*', async (context, next) => {
    const requestId = requestIdFrom(context.req.raw);
    const startedAt = Date.now();
    context.set('requestId', requestId);

    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    const origin = context.req.header('origin');

    if (origin && !environment.corsAllowedOrigins.has(origin)) {
      throw new ApiError('forbidden', 'This origin is not allowed.', 403);
    }

    if (origin && context.req.method === 'OPTIONS') {
      const response = new Response(null, { status: 204, headers: originHeaders(origin) });
      response.headers.set('x-request-id', requestId);
      return response;
    }

    const decision = await rateLimiter.check({
      key: clientKey(context.req.raw),
      route: context.req.path,
    });

    if (!decision.allowed) {
      logger.rateLimit?.({
        method: context.req.method,
        path: context.req.path,
        requestId,
        retryAfterSeconds: decision.retryAfterSeconds,
      });
      const headers = new Headers({
        'retry-after': String(decision.retryAfterSeconds),
        'x-request-id': requestId,
      });
      if (origin) {
        originHeaders(origin).forEach((value, name) => headers.set(name, value));
      }
      return context.json(
        { error: { code: 'rate_limited', message: 'Too many requests.', requestId } },
        429,
        Object.fromEntries(headers.entries()),
      );
    }

    await next();

    if (origin) {
      originHeaders(origin).forEach((value, name) => context.header(name, value));
    }
    context.header('x-request-id', requestId);
    logger.request({
      durationMs: Date.now() - startedAt,
      method: context.req.method,
      path: context.req.path,
      requestId,
      status: context.res.status,
    });
  });

  app.onError((error, context) => {
    const requestId = context.get('requestId') ?? crypto.randomUUID();
    const apiError =
      error instanceof ApiError
        ? error
        : new ApiError('configuration_error', 'Service configuration is invalid.', 500);

    logger.error({
      code: apiError.code,
      method: context.req.method,
      path: context.req.path,
      requestId,
      status: apiError.status,
    });

    const headers = new Headers({
      'content-type': 'application/json; charset=UTF-8',
      'x-request-id': requestId,
    });
    const origin = context.req.header('origin');
    if (origin) {
      try {
        const environment =
          dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
        if (environment.corsAllowedOrigins.has(origin)) {
          originHeaders(origin).forEach((value, name) => headers.set(name, value));
        }
      } catch {
        // An invalid CORS configuration must not prevent the typed error response.
      }
    }

    return new Response(
      JSON.stringify({
        error: {
          code: apiError.code,
          message: apiError.message,
          ...(apiError.details ? { details: apiError.details } : {}),
          requestId,
        },
      }),
      {
        status: apiError.status,
        headers,
      },
    );
  });

  app.get('/health', (context) => {
    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    return context.json({
      status: 'ok',
      service: 'navode-api',
      environment: environment.appEnvironment,
    });
  });

  app.get('/ready', async (context) => {
    const ready = await (dependencies.databaseReady?.() ?? defaultReadiness(context.env));
    if (!ready) {
      throw new ApiError('database_unavailable', 'Database is unavailable.', 503);
    }
    return context.json({ status: 'ready', service: 'navode-api' });
  });

  app.get('/version', (context) => {
    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    return context.json({
      service: 'navode-api',
      version: environment.appVersion || NAVODE_VERSION,
    });
  });

  const v1 = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  app.all('/api/auth/*', async (context) => {
    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    const runtime = createRuntimeAuth(context.env, environment);
    try {
      return await runtime.handle(context.req.raw);
    } finally {
      await runtime.close();
    }
  });

  v1.get('/status', (context) =>
    context.json({ service: 'navode-api', version: 'v1', sync: 'foundation' }),
  );

  v1.get('/me', async (context) => {
    const actor = await authenticate(context);
    return context.json({
      userId: actor.userId,
      ...(actor.deviceId ? { deviceId: actor.deviceId } : {}),
    });
  });

  v1.get('/sync/status', async (context) => {
    const actor = await authenticate(context);
    return withDatabase(context, async (database) => {
      const devices = await createDeviceRepository(database).listForUser(actor.userId);
      return context.json({
        connectedDevices: devices.filter((device) => device.status === 'active').length,
        currentDeviceId: actor.deviceId ?? null,
        lastSuccessfulSyncAt:
          devices.find((device) => device.id === actor.deviceId)?.lastSeenAt ?? null,
        status: 'synced',
      });
    });
  });

  v1.get('/sync/settings', async (context) => {
    const actor = await authenticate(context);
    return withDatabase(context, async (database) => {
      const document = await createServerSyncRepository(database).getSettings(actor.userId);
      return context.json(
        document
          ? { payload: document.payload, revision: document.currentRevision }
          : { payload: null, revision: 0 },
      );
    });
  });

  v1.post('/sync/settings', async (context) => {
    const actor = await authenticate(context);
    const parsed = syncOperationSchema.safeParse(await context.req.json());
    if (!parsed.success) throw new ApiError('invalid_request', 'Sync operation is invalid.', 400);
    return withDatabase(context, async (database) => {
      const result = await createServerSyncRepository(database).applySettingsOperation({
        ...parsed.data,
        documentId: crypto.randomUUID(),
        revisionId: crypto.randomUUID(),
        userId: actor.userId,
      });
      if (result.kind === 'conflict') {
        throw new ApiError('conflict', 'A newer sync revision exists.', 409, {
          currentRevision: String(result.currentRevision),
        });
      }
      return context.json(result, result.kind === 'applied' ? 201 : 200);
    });
  });

  v1.get('/devices', async (context) => {
    const actor = await authenticate(context);
    return withDatabase(context, async (database) => {
      const devices = await createDeviceRepository(database).listForUser(actor.userId);
      return context.json(
        devices.map((device) => ({ ...device, isCurrent: device.id === actor.deviceId })),
      );
    });
  });

  v1.post('/devices', async (context) => {
    const actor = await authenticate(context);
    const parsed = deviceInputSchema.safeParse(await context.req.json());
    if (!parsed.success)
      throw new ApiError('invalid_request', 'Device registration is invalid.', 400);
    return withDatabase(context, async (database) => {
      const device = await createDeviceRepository(database).register({
        id: crypto.randomUUID(),
        userId: actor.userId,
        ...parsed.data,
      });
      return context.json({ ...device, isCurrent: device.id === actor.deviceId }, 201);
    });
  });

  v1.patch('/devices/:deviceId', async (context) => {
    const actor = await authenticate(context);
    const parsed = renameDeviceSchema.safeParse(await context.req.json());
    if (!parsed.success) throw new ApiError('invalid_request', 'Device name is invalid.', 400);
    return withDatabase(context, async (database) => {
      const device = await createDeviceRepository(database).rename(
        actor.userId,
        context.req.param('deviceId'),
        parsed.data.label,
      );
      if (!device) throw new ApiError('not_found', 'Device was not found.', 404);
      return context.json({ ...device, isCurrent: device.id === actor.deviceId });
    });
  });

  v1.delete('/devices/:deviceId', async (context) => {
    const actor = await authenticate(context);
    if (actor.deviceId === context.req.param('deviceId')) {
      throw new ApiError('invalid_request', 'Use sign-out to remove the current device.', 400);
    }
    return withDatabase(context, async (database) => {
      const device = await createDeviceRepository(database).revoke(
        actor.userId,
        context.req.param('deviceId'),
      );
      if (!device) throw new ApiError('not_found', 'Active device was not found.', 404);
      await createSecurityEventRepository(database).record({
        deviceId: device.id,
        eventType: 'device_revoked',
        id: crypto.randomUUID(),
        metadata: { source: 'device-management' },
        requestId: context.get('requestId'),
        userId: actor.userId,
      });
      return context.body(null, 204);
    });
  });

  v1.get('/security-events', async (context) => {
    const actor = await authenticate(context);
    return withDatabase(context, async (database) => {
      const events = await createSecurityEventRepository(database).listForUser(actor.userId);
      return context.json(
        events.map(({ metadata, ...event }) => ({
          ...event,
          // Metadata is deliberately an allowlisted operational marker, not
          // request content, credentials, IP addresses, or user agent data.
          metadata,
        })),
      );
    });
  });

  v1.get('/backups', async (context) => {
    const actor = await authenticate(context);
    return withDatabase(context, async (database) => {
      const backups = await createCloudBackupRepository(database).listForUser(actor.userId);
      return context.json(backups.map(({ snapshot: _snapshot, ...backup }) => backup));
    });
  });

  v1.post('/backups', async (context) => {
    const actor = await authenticate(context);
    const parsed = cloudBackupSchema.safeParse(await context.req.json());
    if (!parsed.success) throw new ApiError('invalid_request', 'Cloud backup is invalid.', 400);
    return withDatabase(context, async (database) => {
      const backup = await createCloudBackupRepository(database).create({
        id: crypto.randomUUID(),
        userId: actor.userId,
        ...parsed.data,
      });
      return context.json({ id: backup.id, createdAt: backup.createdAt }, 201);
    });
  });

  v1.post('/backups/:backupId/restore', async (context) => {
    const actor = await authenticate(context);
    const parsed = restoreSchema.safeParse(await context.req.json());
    if (!parsed.success) {
      throw new ApiError('invalid_request', 'Explicit restore confirmation is required.', 400);
    }
    return withDatabase(context, async (database) => {
      const backup = await createCloudBackupRepository(database).getForUser(
        actor.userId,
        context.req.param('backupId'),
      );
      if (!backup) throw new ApiError('not_found', 'Cloud backup was not found.', 404);
      // The server returns a snapshot only after confirmation. Local replacement
      // remains a client-side, user-controlled operation and is never automatic.
      return context.json({ backupId: backup.id, snapshot: backup.snapshot });
    });
  });

  app.route('/api/v1', v1);

  return app;
}

const app = createApp();

export default app;
