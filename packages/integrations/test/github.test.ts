import {
  fetchGitHubRepositoryStatus,
  parseGitHubRepositoryReference,
  readGitHubCachedStatus,
  refreshGitHubRepositoryCache,
} from '../src/index';
import { describe, expect, it, vi } from 'vitest';

const repository = parseGitHubRepositoryReference('Rorfost/navode')!;

function response(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), { status: 200, ...init });
}

describe('GitHub provider', () => {
  it('loads public repository status without authorization', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          full_name: 'Rorfost/navode',
          html_url: 'https://github.com/Rorfost/navode',
          private: false,
          archived: false,
          default_branch: 'main',
          updated_at: '2026-09-19T00:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(response([{ number: 1 }]))
      .mockResolvedValueOnce(response([{ number: 2 }, { pull_request: {} }]))
      .mockResolvedValueOnce(
        response({
          workflow_runs: [
            {
              name: 'CI',
              status: 'completed',
              conclusion: 'success',
              html_url: 'https://github.com/Rorfost/navode/actions/runs/1',
            },
          ],
        }),
      );
    const result = await fetchGitHubRepositoryStatus(repository, { fetch });
    expect(result).toMatchObject({
      kind: 'success',
      status: { openPullRequestCount: 1, issueCount: 1, workflow: { conclusion: 'success' } },
    });
    expect(fetch.mock.calls[0]?.[1]).not.toMatchObject({
      headers: { Authorization: expect.anything() },
    });
  });

  it('uses an in-memory token only when one is explicitly supplied', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        response({ full_name: 'Rorfost/navode', html_url: 'https://github.com/Rorfost/navode' }),
      );
    await fetchGitHubRepositoryStatus(repository, { accessToken: 'not-persisted', fetch });
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer not-persisted' },
    });
  });

  it('returns rate-limit and network errors without discarding cache', async () => {
    const limited = await fetchGitHubRepositoryStatus(repository, {
      fetch: vi
        .fn()
        .mockResolvedValue(response({}, { status: 429, headers: { 'retry-after': '60' } })),
      now: () => new Date('2026-09-19T00:00:00.000Z'),
    });
    expect(limited).toMatchObject({
      kind: 'error',
      error: { code: 'rate-limited', retryAt: '2026-09-19T00:01:00.000Z' },
    });
    const offline = await fetchGitHubRepositoryStatus(repository, {
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
    });
    expect(offline).toMatchObject({ kind: 'error', error: { code: 'network-error' } });
  });

  it('retains fresh cached data instead of polling', async () => {
    const cache = {
      entries: {
        'rorfost/navode': {
          cachedAt: new Date().toISOString(),
          value: {
            fullName: 'Rorfost/navode',
            issueCount: 1,
            openPullRequestCount: 1,
            repositoryUrl: 'https://github.com/Rorfost/navode',
          },
        },
      },
    };
    const result = await refreshGitHubRepositoryCache(cache, [repository], { fetch: vi.fn() });
    expect(result.refreshed).toBe(false);
    expect(readGitHubCachedStatus(result.cache, repository)?.issueCount).toBe(1);
  });

  it('does not make a request when no connected repository is supplied', async () => {
    const fetch = vi.fn();
    const result = await refreshGitHubRepositoryCache({ entries: {} }, [], { fetch });
    expect(result).toMatchObject({ refreshed: false, cache: { entries: {} } });
    expect(fetch).not.toHaveBeenCalled();
  });
});
