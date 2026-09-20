import type { IntegrationCacheState } from './index';

export const PROJECT_HEALTH_TIMEOUT_MS = 8_000;
export const PROJECT_HEALTH_STALE_AFTER_MS = 10 * 60_000;
export const MAX_PROJECT_HEALTH_TARGETS = 20;

export interface ProjectHealthTarget {
  id: string;
  label: string;
  projectId?: string;
  url: string;
  expectedStatus: number;
}

export interface ProjectHealthCheck {
  checkedAt: string;
  expectedStatus: number;
  responseTimeMs?: number;
  status: 'reachable' | 'unexpected-status' | 'unreachable' | 'offline';
  statusCode?: number;
}

export type ProjectHealthResult =
  | { kind: 'success'; check: ProjectHealthCheck }
  | { kind: 'error'; check: ProjectHealthCheck; code: 'offline' | 'timeout' | 'request-failed' };

export interface ProjectHealthCheckOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  online?: boolean;
  timeoutMs?: number;
}

export function createProjectHealthTarget(value: unknown): ProjectHealthTarget | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  const projectId = typeof value.projectId === 'string' ? value.projectId.trim() : undefined;
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  const expectedStatus =
    typeof value.expectedStatus === 'number' ? value.expectedStatus : Number.NaN;
  if (
    !id ||
    id.length > 120 ||
    !label ||
    label.length > 80 ||
    (projectId !== undefined && (!projectId || projectId.length > 120)) ||
    !isSafeHealthUrl(url) ||
    !Number.isInteger(expectedStatus) ||
    expectedStatus < 100 ||
    expectedStatus > 599
  ) {
    return null;
  }
  return { id, label, ...(projectId ? { projectId } : {}), url, expectedStatus };
}

/** Only http(s) service endpoints are eligible for a browser-origin health request. */
export function isSafeHealthUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

/**
 * Checks a configured endpoint from the browser. This deliberately does not proxy arbitrary URLs:
 * a CORS or network limitation is represented as an unavailable check and cached data is retained.
 */
export async function checkProjectHealth(
  target: ProjectHealthTarget,
  options: ProjectHealthCheckOptions = {},
): Promise<ProjectHealthResult> {
  const now = options.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  if (options.online === false) {
    return {
      kind: 'error',
      code: 'offline',
      check: { checkedAt, expectedStatus: target.expectedStatus, status: 'offline' },
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? PROJECT_HEALTH_TIMEOUT_MS,
  );
  const startedAt = now().getTime();
  try {
    const response = await (options.fetch ?? fetch)(target.url, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
    });
    const responseTimeMs = Math.max(0, now().getTime() - startedAt);
    const check: ProjectHealthCheck = {
      checkedAt,
      expectedStatus: target.expectedStatus,
      responseTimeMs,
      statusCode: response.status,
      status: response.status === target.expectedStatus ? 'reachable' : 'unexpected-status',
    };
    return { kind: 'success', check };
  } catch (error) {
    const timedOut =
      controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError');
    return {
      kind: 'error',
      code: timedOut ? 'timeout' : 'request-failed',
      check: { checkedAt, expectedStatus: target.expectedStatus, status: 'unreachable' },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function readProjectHealthCheck(
  cache: IntegrationCacheState | undefined,
  targetId: string,
): ProjectHealthCheck | undefined {
  const value = cache?.entries[targetId]?.value;
  return isProjectHealthCheck(value) ? value : undefined;
}

export function saveProjectHealthCheck(
  cache: IntegrationCacheState,
  targetId: string,
  check: ProjectHealthCheck,
): IntegrationCacheState {
  return { entries: { ...cache.entries, [targetId]: { cachedAt: check.checkedAt, value: check } } };
}

export function isProjectHealthCheckStale(
  cache: IntegrationCacheState | undefined,
  targetId: string,
  now = new Date(),
): boolean {
  const check = readProjectHealthCheck(cache, targetId);
  return !check || now.getTime() - Date.parse(check.checkedAt) >= PROJECT_HEALTH_STALE_AFTER_MS;
}

function isProjectHealthCheck(value: unknown): value is ProjectHealthCheck {
  if (
    !isRecord(value) ||
    typeof value.checkedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.checkedAt))
  )
    return false;
  return (
    typeof value.expectedStatus === 'number' &&
    Number.isInteger(value.expectedStatus) &&
    value.expectedStatus >= 100 &&
    value.expectedStatus <= 599 &&
    (value.status === 'reachable' ||
      value.status === 'unexpected-status' ||
      value.status === 'unreachable' ||
      value.status === 'offline') &&
    (value.statusCode === undefined ||
      (typeof value.statusCode === 'number' && Number.isInteger(value.statusCode))) &&
    (value.responseTimeMs === undefined ||
      (typeof value.responseTimeMs === 'number' && value.responseTimeMs >= 0))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
