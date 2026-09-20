import {
  fetchGoogleCalendarContext,
  getNextCalendarEvent,
  isCacheStale,
  readCalendarCachedContext,
  saveCalendarCachedContext,
} from '../src/index';
import { describe, expect, it, vi } from 'vitest';

const now = new Date('2026-09-19T08:00:00.000Z');

function response(value: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(value), { status: 200, ...init });
}

describe('Google Calendar provider', () => {
  it('reports disconnected authorization without a token', async () => {
    await expect(fetchGoogleCalendarContext()).resolves.toMatchObject({
      kind: 'error',
      error: { code: 'authorization-required' },
    });
  });

  it('maps all-day, overlapping, and timed events into stable daily context', async () => {
    const fetch = vi.fn().mockResolvedValue(
      response({
        items: [
          {
            id: 'overlap',
            summary: 'Pairing',
            start: { dateTime: '2026-09-19T10:00:00+02:00' },
            end: { dateTime: '2026-09-19T11:00:00+02:00' },
          },
          {
            id: 'all-day',
            summary: 'Holiday',
            start: { date: '2026-09-19' },
            end: { date: '2026-09-20' },
          },
          {
            id: 'next',
            summary: 'Standup',
            start: { dateTime: '2026-09-19T09:00:00+02:00' },
            end: { dateTime: '2026-09-19T10:30:00+02:00' },
          },
        ],
      }),
    );
    const result = await fetchGoogleCalendarContext({
      accessToken: 'memory-only',
      fetch,
      now: () => now,
      timezone: 'Europe/Berlin',
    });
    expect(result).toMatchObject({
      kind: 'success',
      context: {
        timezone: 'Europe/Berlin',
        events: [{ id: 'all-day', allDay: true }, { id: 'next' }, { id: 'overlap' }],
      },
    });
    if (result.kind === 'success') {
      expect(getNextCalendarEvent(result.context, new Date('2026-09-19T06:30:00.000Z'))?.id).toBe(
        'next',
      );
    }
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: 'Bearer memory-only' },
    });
    expect(fetch.mock.calls[0]?.[0]).toContain('timeZone=Europe%2FBerlin');
  });

  it('handles expired authorization, offline mode, no events, and cached context', async () => {
    await expect(
      fetchGoogleCalendarContext({
        accessToken: 'expired',
        fetch: vi.fn().mockResolvedValue(response({}, { status: 401 })),
        now: () => now,
      }),
    ).resolves.toMatchObject({ kind: 'error', error: { code: 'authorization-expired' } });
    await expect(
      fetchGoogleCalendarContext({
        accessToken: 'offline',
        fetch: vi.fn().mockRejectedValue(new Error('offline')),
        now: () => now,
      }),
    ).resolves.toMatchObject({ kind: 'error', error: { code: 'network-error' } });
    const empty = await fetchGoogleCalendarContext({
      accessToken: 'token',
      fetch: vi.fn().mockResolvedValue(response({ items: [] })),
      now: () => now,
    });
    expect(empty).toMatchObject({ kind: 'success', context: { events: [] } });
    if (empty.kind === 'success') {
      const cache = saveCalendarCachedContext({ entries: {} }, empty.context);
      expect(readCalendarCachedContext(cache)).toEqual(empty.context);
      expect(
        isCacheStale(
          cache,
          { staleAfterMs: 5 * 60_000, baseBackoffMs: 1, maxBackoffMs: 1, refreshOnOpen: true },
          now,
        ),
      ).toBe(false);
      expect(
        isCacheStale(
          cache,
          { staleAfterMs: 5 * 60_000, baseBackoffMs: 1, maxBackoffMs: 1, refreshOnOpen: true },
          new Date(now.getTime() + 6 * 60_000),
        ),
      ).toBe(true);
    }
  });
});
