import { z } from 'zod';

const rawEnvironmentSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  APP_VERSION: z.string().trim().min(1).max(100).default('0.0.0-dev'),
  CORS_ALLOWED_ORIGINS: z.string().trim().default('http://localhost:5173'),
});

export type ApiEnvironment = {
  appEnvironment: 'development' | 'test' | 'staging' | 'production';
  appVersion: string;
  corsAllowedOrigins: ReadonlySet<string>;
};

function isAllowedClientOrigin(value: string): boolean {
  try {
    const origin = new URL(value);
    return (
      origin.origin === value &&
      (origin.protocol === 'https:' ||
        origin.protocol === 'http:' ||
        origin.protocol === 'chrome-extension:')
    );
  } catch {
    return false;
  }
}

export function parseEnvironment(bindings: Record<string, string | undefined>): ApiEnvironment {
  const parsed = rawEnvironmentSchema.safeParse(bindings);

  if (!parsed.success) {
    throw new Error('API environment configuration is invalid.');
  }

  const origins = parsed.data.CORS_ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.some((origin) => !isAllowedClientOrigin(origin))) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS must contain explicit HTTP(S) or Chrome extension origins.',
    );
  }

  if (
    parsed.data.APP_ENV === 'production' &&
    origins.some((origin) => origin.startsWith('http://'))
  ) {
    throw new Error('Production CORS origins must use HTTPS or chrome-extension URLs.');
  }

  return {
    appEnvironment: parsed.data.APP_ENV,
    appVersion: parsed.data.APP_VERSION,
    corsAllowedOrigins: new Set(origins),
  };
}
