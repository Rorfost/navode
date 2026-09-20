import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';
import { parseEnvironment } from '../src/environment';

const environment = parseEnvironment({
  APP_ENV: 'test',
  APP_VERSION: 'test',
  CORS_ALLOWED_ORIGINS: 'https://app.navode.test',
});

const silentLogger = { request() {}, error() {} };

describe('Navode API', () => {
  it('returns health metadata', async () => {
    const app = createApp({ environment, logger: silentLogger });
    const response = await app.request('/health');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ok',
      service: 'navode-api',
      environment: 'test',
    });
    expect(response.headers.get('x-request-id')).toMatch(/^[a-zA-Z0-9_-]{8,100}$/);
  });

  it('rejects unknown browser origins and keeps secured routes fail closed', async () => {
    const app = createApp({ environment, logger: silentLogger });
    const forbidden = await app.request('/api/v1/status', {
      headers: { origin: 'https://untrusted.example' },
    });
    const unauthenticated = await app.request('/api/v1/me', {
      headers: { origin: 'https://app.navode.test' },
    });

    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toMatchObject({ error: { code: 'forbidden' } });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get('access-control-allow-origin')).toBe(
      'https://app.navode.test',
    );
    await expect(unauthenticated.json()).resolves.toMatchObject({
      error: { code: 'authentication_required' },
    });
  });

  it('applies explicit CORS and reports database readiness independently', async () => {
    const app = createApp({ environment, logger: silentLogger, databaseReady: async () => false });
    const corsResponse = await app.request('/api/v1/status', {
      headers: { origin: 'https://app.navode.test' },
    });
    const readinessResponse = await app.request('/ready');

    expect(corsResponse.headers.get('access-control-allow-origin')).toBe('https://app.navode.test');
    expect(readinessResponse.status).toBe(503);
    await expect(readinessResponse.json()).resolves.toMatchObject({
      error: { code: 'database_unavailable' },
    });
  });
});
