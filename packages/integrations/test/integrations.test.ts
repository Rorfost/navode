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
    expect(() => createIntegrationRegistry([definition, definition])).toThrow('Duplicate integration id');
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
    const enabled = { ...defaultIntegrationConnection(), enabled: true, status: 'connected' as const, grantedPermissionIds: ['read'] };
    expect(setIntegrationEnabled(enabled, false)).toEqual(defaultIntegrationConnection());
    expect(disconnectIntegration()).toEqual(defaultIntegrationConnection());
  });

  it('uses fresh cache before calling a provider', async () => {
    const refresh = vi.fn();
    const cache = { entries: { activity: { cachedAt: '2026-09-19T10:00:00.000Z', value: {} } } };
    const result = await refreshIntegration(definition, { ...defaultIntegrationConnection(), enabled: true, status: 'connected' }, cache, refresh, { now: new Date('2026-09-19T10:00:30.000Z') });
    expect(result).toMatchObject({ cache, refreshed: false });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('requests only missing permissions after an explicit provider action', async () => {
    const protectedDefinition = { ...definition, permissions: [{ id: 'read', label: 'Read', description: 'Read updates.' }] };
    const request = vi.fn().mockResolvedValue(true);
    const connection = await requestIntegrationPermissions(protectedDefinition, defaultIntegrationConnection(), { request });
    expect(request).toHaveBeenCalledWith(protectedDefinition, protectedDefinition.permissions);
    expect(connection).toMatchObject({ enabled: true, status: 'connected', grantedPermissionIds: ['read'] });
  });

  it('keeps cached data and backs off when a provider fails', async () => {
    const cache = { entries: {} };
    const result = await refreshIntegration(definition, { ...defaultIntegrationConnection(), enabled: true, status: 'connected' }, cache, async () => { throw new Error('offline'); }, { now: new Date('2026-09-19T10:00:00.000Z') });
    expect(result.cache).toEqual(cache);
    expect(result.error).toMatchObject({ code: 'refresh-failed', retryAt: '2026-09-19T10:00:01.000Z' });
  });
});
