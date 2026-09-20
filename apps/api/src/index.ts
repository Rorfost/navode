import { Hono } from 'hono';
import { NAVODE_VERSION } from '@navode/config';
import { createAuthRuntime, RejectingAuthenticator, type Authenticator } from './auth';
import { verifyDatabaseConnection } from './db/database';
import { parseEnvironment, type ApiEnvironment } from './environment';
import { ApiError } from './errors';
import { consoleLogger, type ApiLogger } from './logging';
import { allowAllRateLimiter, type RateLimiter } from './rate-limit';

type HyperdriveBinding = { connectionString: string };

type Bindings = {
  APP_ENV?: string;
  APP_VERSION?: string;
  AUTH_BASE_URL?: string;
  AUTH_SECRET?: string;
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
  };
}

export function createApp(dependencies: ApiDependencies = {}) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
  const logger = dependencies.logger ?? consoleLogger;
  const rateLimiter = dependencies.rateLimiter ?? allowAllRateLimiter;

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
    if (dependencies.authenticator || !context.env?.HYPERDRIVE) {
      const actor = await (dependencies.authenticator ?? new RejectingAuthenticator()).authenticate(
        context.req.raw,
      );
      return context.json({
        userId: actor.userId,
        ...(actor.deviceId ? { deviceId: actor.deviceId } : {}),
      });
    }

    const environment =
      dependencies.environment ?? parseEnvironment(environmentBindings(context.env));
    const runtime = createRuntimeAuth(context.env, environment);
    try {
      const actor = await runtime.authenticate(context.req.raw);
      return context.json({
        userId: actor.userId,
        ...(actor.deviceId ? { deviceId: actor.deviceId } : {}),
      });
    } finally {
      await runtime.close();
    }
  });

  app.route('/api/v1', v1);

  return app;
}

const app = createApp();

export default app;
