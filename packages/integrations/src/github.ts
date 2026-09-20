import type { IntegrationCacheState, IntegrationError } from './index';

const GITHUB_API_ROOT = 'https://api.github.com';
const GITHUB_WEB_ROOT = 'https://github.com';

export interface GitHubRepositoryReference {
  owner: string;
  repository: string;
}

export interface GitHubRepositoryStatus {
  archived: boolean;
  defaultBranch: string;
  description?: string;
  fullName: string;
  isPrivate: boolean;
  issueCount: number;
  openPullRequestCount: number;
  repositoryUrl: string;
  updatedAt: string;
  workflow?: { conclusion: string | null; name: string; status: string; url: string };
}

export type GitHubStatusResult =
  | { kind: 'success'; status: GitHubRepositoryStatus }
  | { kind: 'error'; error: IntegrationError };

export interface GitHubClientOptions {
  /** A fine-grained, read-only token kept only in the calling application's memory. */
  accessToken?: string;
  fetch?: typeof fetch;
  now?: () => Date;
}

export function parseGitHubRepositoryReference(value: string): GitHubRepositoryReference | null {
  const match = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]+)$/.exec(
    value.trim(),
  );
  return match ? { owner: match[1]!, repository: match[2]! } : null;
}

export function formatGitHubRepository(reference: GitHubRepositoryReference): string {
  return `${reference.owner}/${reference.repository}`;
}

export function githubRepositoryUrl(
  reference: GitHubRepositoryReference,
  section?: 'actions' | 'issues' | 'prs',
): string {
  const root = `${GITHUB_WEB_ROOT}/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repository)}`;
  if (section === 'prs') return `${root}/pulls`;
  return section ? `${root}/${section}` : root;
}

export async function fetchGitHubRepositoryStatus(
  reference: GitHubRepositoryReference,
  options: GitHubClientOptions = {},
): Promise<GitHubStatusResult> {
  const request = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const base = `${GITHUB_API_ROOT}/repos/${encodeURIComponent(reference.owner)}/${encodeURIComponent(reference.repository)}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (options.accessToken) headers.Authorization = `Bearer ${options.accessToken}`;

  const repository = await getJson(request, base, headers, now);
  if (repository.kind === 'error') return repository;
  const pullRequests = await getJson(
    request,
    `${base}/pulls?state=open&per_page=100`,
    headers,
    now,
  );
  if (pullRequests.kind === 'error') return pullRequests;
  const issues = await getJson(request, `${base}/issues?state=open&per_page=100`, headers, now);
  if (issues.kind === 'error') return issues;
  const workflows = await getJson(request, `${base}/actions/runs?per_page=1`, headers, now);
  if (workflows.kind === 'error') return workflows;

  const data = repository.value;
  if (!isRecord(data) || typeof data.full_name !== 'string' || typeof data.html_url !== 'string') {
    return {
      kind: 'error',
      error: providerError('invalid-response', 'GitHub returned invalid repository data.', now()),
    };
  }
  const workflow = parseWorkflow(workflows.value);
  return {
    kind: 'success',
    status: {
      archived: data.archived === true,
      defaultBranch: typeof data.default_branch === 'string' ? data.default_branch : 'main',
      ...(typeof data.description === 'string'
        ? { description: data.description.slice(0, 500) }
        : {}),
      fullName: data.full_name,
      isPrivate: data.private === true,
      issueCount: countIssues(issues.value),
      openPullRequestCount: Array.isArray(pullRequests.value) ? pullRequests.value.length : 0,
      repositoryUrl: data.html_url,
      updatedAt: typeof data.updated_at === 'string' ? data.updated_at : now().toISOString(),
      ...(workflow ? { workflow } : {}),
    },
  };
}

export function readGitHubCachedStatus(
  cache: IntegrationCacheState | undefined,
  reference: GitHubRepositoryReference,
): GitHubRepositoryStatus | undefined {
  const entry = cache?.entries[formatGitHubRepository(reference).toLowerCase()];
  return entry && isGitHubRepositoryStatus(entry.value) ? entry.value : undefined;
}

export function saveGitHubCachedStatus(
  cache: IntegrationCacheState,
  status: GitHubRepositoryStatus,
  cachedAt = new Date().toISOString(),
): IntegrationCacheState {
  return {
    entries: {
      ...cache.entries,
      [status.fullName.toLowerCase()]: { cachedAt, value: status },
    },
  };
}

export async function refreshGitHubRepositoryCache(
  cache: IntegrationCacheState,
  references: readonly GitHubRepositoryReference[],
  options: GitHubClientOptions = {},
): Promise<{ cache: IntegrationCacheState; error?: IntegrationError; refreshed: boolean }> {
  let nextCache = cache;
  let lastError: IntegrationError | undefined;
  let refreshed = false;
  const now = options.now ?? (() => new Date());
  for (const reference of references) {
    if (!isGitHubCacheStale(nextCache, reference, now())) continue;
    const result = await fetchGitHubRepositoryStatus(reference, options);
    if (result.kind === 'success') {
      nextCache = saveGitHubCachedStatus(nextCache, result.status, now().toISOString());
      refreshed = true;
    } else {
      lastError = result.error;
    }
  }
  return { cache: nextCache, ...(lastError ? { error: lastError } : {}), refreshed };
}

export function isGitHubCacheStale(
  cache: IntegrationCacheState,
  reference: GitHubRepositoryReference,
  now = new Date(),
): boolean {
  const entry = cache.entries[formatGitHubRepository(reference).toLowerCase()];
  if (!entry) return true;
  const cachedAt = Date.parse(entry.cachedAt);
  return !Number.isFinite(cachedAt) || now.getTime() - cachedAt >= 10 * 60_000;
}

function asyncError(_error: unknown, now: Date): { kind: 'error'; error: IntegrationError } {
  return {
    kind: 'error',
    error: providerError(
      'network-error',
      'GitHub could not be reached. Cached data remains available.',
      now,
    ),
  };
}

async function getJson(
  request: typeof fetch,
  url: string,
  headers: Record<string, string>,
  now: () => Date,
): Promise<{ kind: 'success'; value: unknown } | { kind: 'error'; error: IntegrationError }> {
  let response: Response;
  try {
    response = await request(url, { headers });
  } catch (error) {
    return asyncError(error, now());
  }
  if (response.status === 403 || response.status === 429) {
    const retryAt = getRetryAt(response.headers, now());
    return {
      kind: 'error',
      error: {
        ...providerError(
          'rate-limited',
          'GitHub rate limit reached. Cached data remains available.',
          now(),
        ),
        ...(retryAt ? { retryAt } : {}),
      },
    };
  }
  if (!response.ok) {
    return {
      kind: 'error',
      error: providerError('github-response', 'GitHub could not load this repository.', now()),
    };
  }
  try {
    return { kind: 'success', value: (await response.json()) as unknown };
  } catch {
    return {
      kind: 'error',
      error: providerError('invalid-response', 'GitHub returned unreadable data.', now()),
    };
  }
}

function getRetryAt(headers: Headers, now: Date): string | undefined {
  const retryAfter = Number(headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0)
    return new Date(now.getTime() + retryAfter * 1000).toISOString();
  const reset = Number(headers.get('x-ratelimit-reset'));
  return Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000).toISOString() : undefined;
}

function countIssues(value: unknown): number {
  return Array.isArray(value)
    ? value.filter((item) => isRecord(item) && !Object.hasOwn(item, 'pull_request')).length
    : 0;
}

function parseWorkflow(value: unknown): GitHubRepositoryStatus['workflow'] | undefined {
  if (!isRecord(value) || !Array.isArray(value.workflow_runs)) return undefined;
  const run = value.workflow_runs[0];
  if (
    !isRecord(run) ||
    typeof run.name !== 'string' ||
    typeof run.status !== 'string' ||
    typeof run.html_url !== 'string'
  )
    return undefined;
  return {
    conclusion: typeof run.conclusion === 'string' ? run.conclusion : null,
    name: run.name,
    status: run.status,
    url: run.html_url,
  };
}

function isGitHubRepositoryStatus(value: unknown): value is GitHubRepositoryStatus {
  return (
    isRecord(value) &&
    typeof value.fullName === 'string' &&
    typeof value.issueCount === 'number' &&
    typeof value.openPullRequestCount === 'number' &&
    typeof value.repositoryUrl === 'string'
  );
}

function providerError(code: string, message: string, now: Date): IntegrationError {
  return { code, message, occurredAt: now.toISOString() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
