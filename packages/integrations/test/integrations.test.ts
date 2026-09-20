import {
  DEFAULT_REFRESH_POLICY,
  createRefreshCoordinator,
  createIntegrationRegistry,
  defaultIntegrationConnection,
  disconnectIntegration,
  refreshIntegration,
  requestIntegrationPermissions,
  setIntegrationEnabled,
  type IntegrationDefinition,
  checkProjectHealth,
  createProjectHealthTarget,
  isProjectHealthCheckStale,
  readProjectHealthCheck,
  saveProjectHealthCheck,
} from '../src/index';
import { describe, expect, it, vi } from 'vitest';

const definition: IntegrationDefinition = {
  id: 'github',
  name: 'GitHub',
  description: 'Test provider',
  availability: 'available',
  capabilities: [],
  permissions: [],
  actions: [],
  widgets: [],
  refreshPolicy: { ...DEFAULT_REFRESH_POLICY, staleAfterMs: 60_000, baseBackoffMs: 1_000 },
};

describe('integration foundation', () => {
  it('registers each provider once', () => {
    expect(createIntegrationRegistry([definition]).get('github')).toEqual(definition);
    expect(() => createIntegrationRegistry([definition, definition])).toThrow(
      'Duplicate integration id',
    );
  });

  it('coordinates refreshes through the registered provider', async () => {
    const refresh = vi.fn().mockResolvedValue({ entries: {} });
    const coordinator = createRefreshCoordinator(createIntegrationRegistry([definition]));
    await coordinator.refresh(
      'github',
      { ...defaultIntegrationConnection(), enabled: true, status: 'connected' },
      { entries: {} },
      refresh,
      { mode: 'manual' },
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('disabling or disconnecting clears granted access', () => {
    const enabled = {
      ...defaultIntegrationConnection(),
      enabled: true,
      status: 'connected' as const,
      grantedPermissionIds: ['read'],
    };
    expect(setIntegrationEnabled(enabled, false)).toEqual(defaultIntegrationConnection());
    expect(disconnectIntegration()).toEqual(defaultIntegrationConnection());
  });

  it('uses fresh cache before calling a provider', async () => {
    const refresh = vi.fn();
    const cache = { entries: { activity: { cachedAt: '2026-09-19T10:00:00.000Z', value: {} } } };
    const result = await refreshIntegration(
      definition,
      { ...defaultIntegrationConnection(), enabled: true, status: 'connected' },
      cache,
      refresh,
      { now: new Date('2026-09-19T10:00:30.000Z') },
    );
    expect(result).toMatchObject({ cache, refreshed: false });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('requests only missing permissions after an explicit provider action', async () => {
    const protectedDefinition = {
      ...definition,
      permissions: [{ id: 'read', label: 'Read', description: 'Read updates.' }],
    };
    const request = vi.fn().mockResolvedValue(true);
    const connection = await requestIntegrationPermissions(
      protectedDefinition,
      defaultIntegrationConnection(),
      { request },
    );
    expect(request).toHaveBeenCalledWith(protectedDefinition, protectedDefinition.permissions);
    expect(connection).toMatchObject({
      enabled: true,
      status: 'connected',
      grantedPermissionIds: ['read'],
    });
  });

  it('keeps cached data and backs off when a provider fails', async () => {
    const cache = { entries: {} };
    const result = await refreshIntegration(
      definition,
      { ...defaultIntegrationConnection(), enabled: true, status: 'connected' },
      cache,
      async () => {
        throw new Error('offline');
      },
      { now: new Date('2026-09-19T10:00:00.000Z') },
    );
    expect(result.cache).toEqual(cache);
    expect(result.error).toMatchObject({
      code: 'refresh-failed',
      retryAt: '2026-09-19T10:00:01.000Z',
    });
  });
});

describe('project health', () => {
  const target = {
    id: 'navode-api',
    label: 'Navode API',
    projectId: 'navode',
    url: 'https://example.com/health',
    expectedStatus: 200,
  };

  it('validates safe configured URLs and rejects unsafe schemes', () => {
    expect(createProjectHealthTarget(target)).toEqual(target);
    expect(createProjectHealthTarget({ ...target, url: 'javascript:alert(1)' })).toBeNull();
    expect(
      createProjectHealthTarget({ ...target, url: 'https://user:pass@example.com/health' }),
    ).toBeNull();
  });

  it('records reachability, expected status, and response timing', async () => {
    const result = await checkProjectHealth(target, {
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
      now: () => new Date('2026-09-20T10:00:00.000Z'),
    });
    expect(result).toMatchObject({
      kind: 'success',
      check: { status: 'reachable', statusCode: 200, responseTimeMs: 0 },
    });
  });

  it('keeps an unexpected response distinguishable from an unreachable service', async () => {
    const result = await checkProjectHealth(target, {
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    });
    expect(result).toMatchObject({
      kind: 'success',
      check: { status: 'unexpected-status', statusCode: 503 },
    });
  });

  it('reports offline and request limitations without throwing', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('CORS blocked'));
    await expect(checkProjectHealth(target, { online: false, fetch })).resolves.toMatchObject({
      kind: 'error',
      code: 'offline',
      check: { status: 'offline' },
    });
    expect(fetch).not.toHaveBeenCalled();
    await expect(checkProjectHealth(target, { fetch })).resolves.toMatchObject({
      kind: 'error',
      code: 'request-failed',
      check: { status: 'unreachable' },
    });
  });

  it('times out an unresponsive request and maintains bounded cached state', async () => {
    const abortableFetch: typeof fetch = (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      });
    const result = await checkProjectHealth(target, { fetch: abortableFetch, timeoutMs: 1 });
    expect(result).toMatchObject({
      kind: 'error',
      code: 'timeout',
      check: { status: 'unreachable' },
    });
    const cache = saveProjectHealthCheck({ entries: {} }, target.id, result.check);
    expect(readProjectHealthCheck(cache, target.id)).toEqual(result.check);
    expect(
      isProjectHealthCheckStale(
        cache,
        target.id,
        new Date(Date.parse(result.check.checkedAt) + 10 * 60_000),
      ),
    ).toBe(true);
  });
});
