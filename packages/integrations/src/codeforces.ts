import type { IntegrationCacheState, IntegrationError } from './index';

const CODEFORCES_API_ROOT = 'https://codeforces.com/api';
const CODEFORCES_WEB_ROOT = 'https://codeforces.com';
const CODEFORCES_CACHE_STALE_AFTER_MS = 15 * 60_000;
const CODEFORCES_REQUEST_INTERVAL_MS = 2_000;

/** Codeforces-only shapes stay in this adapter so other CP platforms can be added independently. */
export interface CodeforcesContest {
  durationSeconds?: number;
  id: number;
  name: string;
  phase: string;
  startAt: string;
  url: string;
}

export interface CodeforcesProfile {
  handle: string;
  maxRating?: number;
  rating?: number;
  title?: string;
}

export interface CodeforcesSubmissionSummary {
  contestId?: number;
  id: number;
  problemName: string;
  submittedAt: string;
  verdict: string;
}

export interface CodeforcesContext {
  contests: CodeforcesContest[];
  generatedAt: string;
  profile?: CodeforcesProfile;
  submissions: CodeforcesSubmissionSummary[];
}

export type CodeforcesContestState = 'upcoming' | 'running' | 'finished';
export type CodeforcesContextResult =
  | { kind: 'success'; context: CodeforcesContext }
  | { kind: 'error'; error: IntegrationError };

export interface CodeforcesClientOptions {
  fetch?: typeof fetch;
  now?: () => Date;
  /** Injectable for tests; production waits between API calls to respect Codeforces' public limit. */
  wait?: (milliseconds: number) => Promise<void>;
}

export function parseCodeforcesHandle(value: string): string | null {
  const handle = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,23}$/.test(handle) ? handle : null;
}

export function codeforcesUrl(section: 'contests' | 'problemset' | 'profile' = 'contests', handle?: string): string {
  if (section === 'profile' && handle) return `${CODEFORCES_WEB_ROOT}/profile/${encodeURIComponent(handle)}`;
  if (section === 'problemset') return `${CODEFORCES_WEB_ROOT}/problemset`;
  return `${CODEFORCES_WEB_ROOT}/contests`;
}

export function getCodeforcesContestState(contest: CodeforcesContest, now = new Date()): CodeforcesContestState {
  const start = Date.parse(contest.startAt);
  if (!Number.isFinite(start) || now.getTime() < start || contest.phase === 'BEFORE') return 'upcoming';
  const finish = start + (contest.durationSeconds ?? 0) * 1_000;
  return now.getTime() < finish || contest.phase === 'CODING' ? 'running' : 'finished';
}

export function getNextCodeforcesContest(context: CodeforcesContext, now = new Date()): CodeforcesContest | undefined {
  return context.contests.find((contest) => getCodeforcesContestState(contest, now) === 'upcoming');
}

export async function fetchCodeforcesContext(
  handle: string | undefined,
  options: CodeforcesClientOptions = {},
): Promise<CodeforcesContextResult> {
  const now = options.now ?? (() => new Date());
  const normalizedHandle = handle ? parseCodeforcesHandle(handle) : undefined;
  if (handle && !normalizedHandle) {
    return { kind: 'error', error: providerError('invalid-handle', 'Enter a valid public Codeforces handle.', now()) };
  }

  const contests = await getApiResult(options, 'contest.list?gym=false', now);
  if (contests.kind === 'error') return contests;
  const mappedContests = Array.isArray(contests.value)
    ? contests.value.flatMap(mapCodeforcesContest).sort((left, right) => left.startAt.localeCompare(right.startAt))
    : [];
  if (!normalizedHandle) {
    return { kind: 'success', context: { contests: mappedContests, generatedAt: now().toISOString(), submissions: [] } };
  }

  await (options.wait ?? wait)(CODEFORCES_REQUEST_INTERVAL_MS);
  const user = await getApiResult(options, `user.info?handles=${encodeURIComponent(normalizedHandle)}`, now);
  if (user.kind === 'error') return user;
  const profile = Array.isArray(user.value) ? mapCodeforcesProfile(user.value[0]) : undefined;
  if (!profile) return { kind: 'error', error: providerError('invalid-handle', 'That Codeforces handle was not found.', now()) };

  await (options.wait ?? wait)(CODEFORCES_REQUEST_INTERVAL_MS);
  const submissions = await getApiResult(options, `user.status?handle=${encodeURIComponent(normalizedHandle)}&from=1&count=5`, now);
  if (submissions.kind === 'error') return submissions;
  return {
    kind: 'success',
    context: {
      contests: mappedContests,
      generatedAt: now().toISOString(),
      profile,
      submissions: Array.isArray(submissions.value) ? submissions.value.flatMap(mapCodeforcesSubmission) : [],
    },
  };
}

export function readCodeforcesCachedContext(cache: IntegrationCacheState | undefined): CodeforcesContext | undefined {
  const value = cache?.entries.context?.value;
  return isCodeforcesContext(value) ? value : undefined;
}

export function saveCodeforcesCachedContext(cache: IntegrationCacheState, context: CodeforcesContext): IntegrationCacheState {
  return { entries: { ...cache.entries, context: { cachedAt: context.generatedAt, value: context } } };
}

export function isCodeforcesCacheStale(cache: IntegrationCacheState, now = new Date()): boolean {
  const cachedAt = cache.entries.context?.cachedAt;
  return !cachedAt || !Number.isFinite(Date.parse(cachedAt)) || now.getTime() - Date.parse(cachedAt) >= CODEFORCES_CACHE_STALE_AFTER_MS;
}

async function getApiResult(
  options: CodeforcesClientOptions,
  path: string,
  now: () => Date,
): Promise<{ kind: 'success'; value: unknown } | { kind: 'error'; error: IntegrationError }> {
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(`${CODEFORCES_API_ROOT}/${path}`);
  } catch {
    return { kind: 'error', error: providerError('network-error', 'Codeforces could not be reached. Cached data remains available.', now()) };
  }
  if (!response.ok) return { kind: 'error', error: providerError('codeforces-response', 'Codeforces could not load public data. Cached data remains available.', now()) };
  try {
    const body = (await response.json()) as unknown;
    if (!isRecord(body) || body.status !== 'OK') {
      return { kind: 'error', error: providerError('codeforces-api-error', 'Codeforces did not return public data. Cached data remains available.', now()) };
    }
    return { kind: 'success', value: body.result };
  } catch {
    return { kind: 'error', error: providerError('invalid-response', 'Codeforces returned unreadable data.', now()) };
  }
}

function mapCodeforcesContest(value: unknown): CodeforcesContest[] {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.name !== 'string' || typeof value.startTimeSeconds !== 'number') return [];
  return [{
    ...(typeof value.durationSeconds === 'number' ? { durationSeconds: value.durationSeconds } : {}),
    id: value.id,
    name: value.name.slice(0, 300),
    phase: typeof value.phase === 'string' ? value.phase : 'UNKNOWN',
    startAt: new Date(value.startTimeSeconds * 1_000).toISOString(),
    url: `${CODEFORCES_WEB_ROOT}/contest/${value.id}`,
  }];
}

function mapCodeforcesProfile(value: unknown): CodeforcesProfile | undefined {
  if (!isRecord(value) || typeof value.handle !== 'string') return undefined;
  return {
    handle: value.handle,
    ...(typeof value.maxRating === 'number' ? { maxRating: value.maxRating } : {}),
    ...(typeof value.rating === 'number' ? { rating: value.rating } : {}),
    ...(typeof value.rank === 'string' ? { title: value.rank } : {}),
  };
}

function mapCodeforcesSubmission(value: unknown): CodeforcesSubmissionSummary[] {
  if (!isRecord(value) || typeof value.id !== 'number' || typeof value.creationTimeSeconds !== 'number') return [];
  const problem = isRecord(value.problem) ? value.problem : {};
  return [{
    ...(typeof value.contestId === 'number' ? { contestId: value.contestId } : {}),
    id: value.id,
    problemName: typeof problem.name === 'string' ? problem.name.slice(0, 300) : 'Unknown problem',
    submittedAt: new Date(value.creationTimeSeconds * 1_000).toISOString(),
    verdict: typeof value.verdict === 'string' ? value.verdict : 'Unknown',
  }];
}

function isCodeforcesContext(value: unknown): value is CodeforcesContext {
  return (
    isRecord(value) &&
    typeof value.generatedAt === 'string' &&
    Array.isArray(value.contests) &&
    value.contests.every(isCodeforcesContest) &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isCodeforcesSubmission) &&
    (value.profile === undefined || isCodeforcesProfile(value.profile))
  );
}

function isCodeforcesContest(value: unknown): value is CodeforcesContest {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.phase === 'string' &&
    typeof value.startAt === 'string' &&
    typeof value.url === 'string'
  );
}

function isCodeforcesProfile(value: unknown): value is CodeforcesProfile {
  return isRecord(value) && typeof value.handle === 'string';
}

function isCodeforcesSubmission(value: unknown): value is CodeforcesSubmissionSummary {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.problemName === 'string' &&
    typeof value.submittedAt === 'string' &&
    typeof value.verdict === 'string'
  );
}

function providerError(code: string, message: string, now: Date): IntegrationError {
  return { code, message, occurredAt: now.toISOString() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
