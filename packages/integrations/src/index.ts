export * from './github';
export * from './calendar';
export * from './codeforces';

export type IntegrationId = 'github' | 'google-calendar' | 'competitive-programming' | 'project-health';

export type IntegrationConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type IntegrationAvailability = 'planned' | 'available';

export interface IntegrationCapability {
  id: string;
  label: string;
  description: string;
}

/** A permission is declared by its provider and requested only when that provider needs it. */
export interface IntegrationPermission {
  id: string;
  label: string;
  description: string;
}

export interface ProviderAction {
  id: string;
  label: string;
  capabilityId: string;
}

export interface IntegrationWidget {
  id: string;
  title: string;
  capabilityId: string;
  emptyMessage: string;
}

export interface RefreshPolicy {
  /** Cached content remains usable while a provider is unavailable. */
  staleAfterMs: number;
  /** The coordinator delays retries after consecutive failures. */
  baseBackoffMs: number;
  maxBackoffMs: number;
  refreshOnOpen: boolean;
}

export interface IntegrationError {
  code: string;
  message: string;
  occurredAt: string;
  retryAt?: string;
}

export interface IntegrationConnection {
  enabled: boolean;
  status: IntegrationConnectionStatus;
  grantedPermissionIds: string[];
  lastRefreshAt?: string;
  error?: IntegrationError;
}

export interface IntegrationCacheEntry {
  cachedAt: string;
  value: unknown;
}

export interface IntegrationCacheState {
  entries: Record<string, IntegrationCacheEntry>;
}

export interface IntegrationDefinition {
  id: IntegrationId;
  name: string;
  description: string;
  availability: IntegrationAvailability;
  capabilities: readonly IntegrationCapability[];
  permissions: readonly IntegrationPermission[];
  actions: readonly ProviderAction[];
  widgets: readonly IntegrationWidget[];
  refreshPolicy: RefreshPolicy;
}

export interface IntegrationRegistry {
  all(): readonly IntegrationDefinition[];
  get(id: IntegrationId): IntegrationDefinition | undefined;
}

export function createIntegrationRegistry(
  definitions: readonly IntegrationDefinition[],
): IntegrationRegistry {
  const byId = new Map<IntegrationId, IntegrationDefinition>();
  for (const definition of definitions) {
    if (byId.has(definition.id)) throw new Error(`Duplicate integration id: ${definition.id}`);
    validateDefinition(definition);
    byId.set(definition.id, definition);
  }
  return {
    all: () => [...byId.values()],
    get: (id) => byId.get(id),
  };
}

export const DEFAULT_REFRESH_POLICY: RefreshPolicy = {
  staleAfterMs: 5 * 60_000,
  baseBackoffMs: 30_000,
  maxBackoffMs: 30 * 60_000,
  refreshOnOpen: true,
};

/** Providers become available independently; their API clients remain in dedicated adapter modules. */
export const NAVODE_INTEGRATIONS = createIntegrationRegistry([
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repository activity and pull-request status.',
    availability: 'available',
    capabilities: [
      { id: 'repository-status', label: 'Repository status', description: 'Read repository activity and metadata.' },
      { id: 'pull-requests', label: 'Pull requests', description: 'Read open pull requests.' },
      { id: 'issues', label: 'Issues', description: 'Read open issues.' },
      { id: 'workflow-runs', label: 'Workflow runs', description: 'Read recent workflow status.' },
    ],
    permissions: [
      { id: 'github-api', label: 'GitHub API access', description: 'Read selected repository data from api.github.com.' },
    ],
    actions: [
      { id: 'open-repository', label: 'Open repository', capabilityId: 'repository-status' },
      { id: 'open-pull-requests', label: 'Open pull requests', capabilityId: 'pull-requests' },
      { id: 'open-issues', label: 'Open issues', capabilityId: 'issues' },
      { id: 'open-actions', label: 'Open workflow runs', capabilityId: 'workflow-runs' },
    ],
    widgets: [
      { id: 'repository-status', title: 'Repository status', capabilityId: 'repository-status', emptyMessage: 'No GitHub repository selected.' },
    ],
    refreshPolicy: { ...DEFAULT_REFRESH_POLICY, staleAfterMs: 10 * 60_000 },
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Upcoming events from calendars you choose to connect.',
    availability: 'available',
    capabilities: [{ id: 'upcoming-events', label: 'Upcoming events', description: 'Read today’s upcoming events.' }],
    permissions: [{ id: 'calendar-events-readonly', label: 'Calendar events (read-only)', description: 'Read today’s events from your primary calendar.' }],
    actions: [{ id: 'open-calendar', label: 'Open Google Calendar', capabilityId: 'upcoming-events' }],
    widgets: [{ id: 'daily-context', title: 'Today', capabilityId: 'upcoming-events', emptyMessage: 'No upcoming events today.' }],
    refreshPolicy: { ...DEFAULT_REFRESH_POLICY, staleAfterMs: 5 * 60_000 },
  },
  {
    id: 'competitive-programming',
    name: 'Competitive programming',
    description: 'Public Codeforces contests and an optional public profile handle.',
    availability: 'available',
    capabilities: [
      { id: 'contest-status', label: 'Upcoming contests', description: 'Read public Codeforces contest timing.' },
      { id: 'public-profile', label: 'Public profile', description: 'Read an optional public Codeforces rating and recent submissions.' },
    ],
    permissions: [{ id: 'codeforces-public-api', label: 'Codeforces public API', description: 'Read public contest and optional public-handle data from codeforces.com.' }],
    actions: [
      { id: 'open-contests', label: 'Open Codeforces contests', capabilityId: 'contest-status' },
      { id: 'open-problemset', label: 'Open Codeforces practice', capabilityId: 'contest-status' },
    ],
    widgets: [{ id: 'contest-context', title: 'Contests', capabilityId: 'contest-status', emptyMessage: 'No upcoming Codeforces contests.' }],
    refreshPolicy: { ...DEFAULT_REFRESH_POLICY, staleAfterMs: 15 * 60_000 },
  },
  {
    id: 'project-health',
    name: 'Project health',
    description: 'Service and deployment health for projects you configure.',
    availability: 'planned',
    capabilities: [{ id: 'service-status', label: 'Service status', description: 'Read configured service health.' }],
    permissions: [],
    actions: [],
    widgets: [],
    refreshPolicy: DEFAULT_REFRESH_POLICY,
  },
]);

export function defaultIntegrationConnection(): IntegrationConnection {
  return { enabled: false, status: 'disconnected', grantedPermissionIds: [] };
}

export function setIntegrationEnabled(
  connection: IntegrationConnection,
  enabled: boolean,
): IntegrationConnection {
  return enabled
    ? { ...connection, enabled }
    : { enabled, status: 'disconnected', grantedPermissionIds: [] };
}

export function disconnectIntegration(): IntegrationConnection {
  return defaultIntegrationConnection();
}

export interface RefreshResult {
  cache: IntegrationCacheState;
  error?: IntegrationError;
  refreshed: boolean;
}

export interface RefreshRequest {
  mode?: 'manual' | 'open';
  now?: Date;
}

export type ProviderRefresh = (
  cached: IntegrationCacheState,
) => Promise<IntegrationCacheState>;

export interface RefreshCoordinator {
  refresh(
    providerId: IntegrationId,
    connection: IntegrationConnection,
    cache: IntegrationCacheState,
    refresh: ProviderRefresh,
    request?: RefreshRequest,
  ): Promise<RefreshResult>;
}

export function createRefreshCoordinator(registry: IntegrationRegistry): RefreshCoordinator {
  return {
    refresh(providerId, connection, cache, refresh, request) {
      const definition = registry.get(providerId);
      if (!definition) {
        return Promise.resolve({
          cache,
          error: {
            code: 'unknown-provider',
            message: 'This integration is not registered.',
            occurredAt: new Date().toISOString(),
          },
          refreshed: false,
        });
      }
      return refreshIntegration(definition, connection, cache, refresh, request);
    },
  };
}

/** Host adapters implement this with a user-initiated provider or browser permission prompt. */
export interface IntegrationPermissionRequester {
  request(provider: IntegrationDefinition, permissions: readonly IntegrationPermission[]): Promise<boolean>;
}

/** Requests only the provider permissions that have not already been granted. */
export async function requestIntegrationPermissions(
  definition: IntegrationDefinition,
  connection: IntegrationConnection,
  requester: IntegrationPermissionRequester,
): Promise<IntegrationConnection> {
  const missing = definition.permissions.filter(
    (permission) => !connection.grantedPermissionIds.includes(permission.id),
  );
  if (!missing.length) {
    return { ...withoutConnectionError(connection), enabled: true, status: 'connected' };
  }
  let granted: boolean;
  try {
    granted = await requester.request(definition, missing);
  } catch {
    return {
      ...connection,
      status: 'error',
      error: {
        code: 'permission-request-failed',
        message: 'Could not request permission for this integration.',
        occurredAt: new Date().toISOString(),
      },
    };
  }
  if (!granted) {
    return {
      ...connection,
      status: 'error',
      error: {
        code: 'permission-denied',
        message: 'Required permission was not granted.',
        occurredAt: new Date().toISOString(),
      },
    };
  }
  return {
    ...withoutConnectionError(connection),
    enabled: true,
    status: 'connected',
    grantedPermissionIds: [...new Set([...connection.grantedPermissionIds, ...missing.map(({ id }) => id)])],
  };
}

/**
 * Keeps providers isolated: a provider failure returns its prior cache and never throws into startup.
 */
export async function refreshIntegration(
  definition: IntegrationDefinition,
  connection: IntegrationConnection,
  cache: IntegrationCacheState,
  refresh: ProviderRefresh,
  request: RefreshRequest = {},
): Promise<RefreshResult> {
  const now = request.now ?? new Date();
  const isManualRefresh = request.mode === 'manual';
  if (!connection.enabled || connection.status === 'disconnected') {
    return { cache, refreshed: false };
  }
  if (!isManualRefresh && !definition.refreshPolicy.refreshOnOpen) {
    return { cache, refreshed: false };
  }
  if (!isManualRefresh && !isCacheStale(cache, definition.refreshPolicy, now)) {
    return { cache, refreshed: false };
  }
  if (!isManualRefresh && isBackoffActive(connection.error, now)) {
    return connection.error
      ? { cache, error: connection.error, refreshed: false }
      : { cache, refreshed: false };
  }
  try {
    return { cache: await refresh(cache), refreshed: true };
  } catch {
    const error = createRefreshError(connection.error, definition.refreshPolicy, now);
    return { cache, error, refreshed: false };
  }
}

export function isCacheStale(cache: IntegrationCacheState, policy: RefreshPolicy, now = new Date()): boolean {
  const timestamps = Object.values(cache.entries)
    .map((entry) => Date.parse(entry.cachedAt))
    .filter(Number.isFinite);
  if (!timestamps.length) return true;
  return now.getTime() - Math.max(...timestamps) >= policy.staleAfterMs;
}

function isBackoffActive(error: IntegrationError | undefined, now: Date): boolean {
  return Boolean(error?.retryAt && Date.parse(error.retryAt) > now.getTime());
}

function createRefreshError(
  previous: IntegrationError | undefined,
  policy: RefreshPolicy,
  now: Date,
): IntegrationError {
  const previousDelay = previous?.retryAt ? Math.max(0, Date.parse(previous.retryAt) - Date.parse(previous.occurredAt)) : 0;
  const delay = Math.min(
    previousDelay > 0 ? previousDelay * 2 : policy.baseBackoffMs,
    policy.maxBackoffMs,
  );
  return {
    code: 'refresh-failed',
    message: 'Could not refresh this integration. Cached data remains available.',
    occurredAt: now.toISOString(),
    retryAt: new Date(now.getTime() + delay).toISOString(),
  };
}

function withoutConnectionError(connection: IntegrationConnection): Omit<IntegrationConnection, 'error'> {
  const { error: _error, ...withoutError } = connection;
  return withoutError;
}

function validateDefinition(definition: IntegrationDefinition): void {
  if (!definition.name.trim() || definition.refreshPolicy.staleAfterMs < 0) {
    throw new Error(`Invalid integration definition: ${definition.id}`);
  }
}
