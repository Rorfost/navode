import {
  fetchCodeforcesContext,
  getCodeforcesContestState,
  getNextCodeforcesContest,
  isCodeforcesCacheStale,
  parseCodeforcesHandle,
  readCodeforcesCachedContext,
  saveCodeforcesCachedContext,
} from '../src/index';
import { describe, expect, it, vi } from 'vitest';

const now = new Date('2026-09-19T08:00:00.000Z');

function response(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), { status: 200, ...init });
}

describe('Codeforces provider', () => {
  it('rejects invalid public handles before making a request', async () => {
    const fetch = vi.fn();
    await expect(
      fetchCodeforcesContext('bad handle!', { fetch, now: () => now }),
    ).resolves.toMatchObject({ kind: 'error', error: { code: 'invalid-handle' } });
    expect(fetch).not.toHaveBeenCalled();
    expect(parseCodeforcesHandle('tourist_2')).toBe('tourist_2');
  });

  it('maps public contests, profile, submissions, and normalizes start times', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          status: 'OK',
          result: [
            {
              id: 2,
              name: 'Later Round',
              phase: 'BEFORE',
              startTimeSeconds: 1_790_000_000,
              durationSeconds: 7200,
            },
            {
              id: 1,
              name: 'Soon Round',
              phase: 'BEFORE',
              startTimeSeconds: 1_789_000_000,
              durationSeconds: 7200,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          status: 'OK',
          result: [
            { handle: 'tourist', rank: 'legendary grandmaster', rating: 3800, maxRating: 3900 },
          ],
        }),
      )
      .mockResolvedValueOnce(
        response({
          status: 'OK',
          result: [
            {
              id: 7,
              creationTimeSeconds: 1_789_000_100,
              contestId: 1,
              verdict: 'OK',
              problem: { name: 'A. Sample' },
            },
          ],
        }),
      );
    const result = await fetchCodeforcesContext('tourist', {
      fetch,
      now: () => now,
      wait: async () => undefined,
    });
    expect(result).toMatchObject({
      kind: 'success',
      context: {
        contests: [{ id: 1 }, { id: 2 }],
        profile: { handle: 'tourist', rating: 3800, title: 'legendary grandmaster' },
        submissions: [{ problemName: 'A. Sample', verdict: 'OK' }],
      },
    });
    expect(fetch.mock.calls[0]?.[0]).toContain('contest.list?gym=false');
    expect(fetch.mock.calls[1]?.[0]).toContain('user.info?handles=tourist');
    expect(fetch.mock.calls[2]?.[0]).toContain('user.status?handle=tourist');
  });

  it('distinguishes upcoming, running, and finished contests and handles no-contest state', () => {
    const contest = {
      id: 1,
      name: 'Round',
      phase: 'BEFORE',
      startAt: '2026-09-19T09:00:00.000Z',
      durationSeconds: 7200,
      url: 'https://codeforces.com/contest/1',
    };
    expect(getCodeforcesContestState(contest, new Date('2026-09-19T08:00:00.000Z'))).toBe(
      'upcoming',
    );
    expect(
      getCodeforcesContestState(
        { ...contest, phase: 'CODING' },
        new Date('2026-09-19T10:00:00.000Z'),
      ),
    ).toBe('running');
    expect(
      getCodeforcesContestState(
        { ...contest, phase: 'FINISHED' },
        new Date('2026-09-19T12:00:00.000Z'),
      ),
    ).toBe('finished');
    expect(
      getNextCodeforcesContest(
        { contests: [], generatedAt: now.toISOString(), submissions: [] },
        now,
      ),
    ).toBeUndefined();
  });

  it('keeps cached data usable when Codeforces is unavailable', async () => {
    const offline = await fetchCodeforcesContext(undefined, {
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
      now: () => now,
    });
    expect(offline).toMatchObject({ kind: 'error', error: { code: 'network-error' } });
    const context = { contests: [], generatedAt: now.toISOString(), submissions: [] };
    const cache = saveCodeforcesCachedContext({ entries: {} }, context);
    expect(readCodeforcesCachedContext(cache)).toEqual(context);
    expect(isCodeforcesCacheStale(cache, new Date(now.getTime() + 14 * 60_000))).toBe(false);
    expect(isCodeforcesCacheStale(cache, new Date(now.getTime() + 16 * 60_000))).toBe(true);
  });
});
