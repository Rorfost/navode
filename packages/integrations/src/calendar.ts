import type { IntegrationCacheState, IntegrationError } from './index';

export const GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE =
  'https://www.googleapis.com/auth/calendar.events.readonly';

export interface CalendarEvent {
  allDay: boolean;
  endAt?: string;
  htmlLink?: string;
  id: string;
  startAt?: string;
  title: string;
}

export interface CalendarContext {
  events: CalendarEvent[];
  generatedAt: string;
  timezone: string;
}

export type CalendarContextResult =
  | { kind: 'success'; context: CalendarContext }
  | { kind: 'error'; error: IntegrationError };

export interface GoogleCalendarClientOptions {
  accessToken?: string;
  fetch?: typeof fetch;
  now?: () => Date;
  timezone?: string;
}

export async function fetchGoogleCalendarContext(
  options: GoogleCalendarClientOptions = {},
): Promise<CalendarContextResult> {
  const now = options.now ?? (() => new Date());
  if (!options.accessToken) {
    return {
      kind: 'error',
      error: error('authorization-required', 'Connect Google Calendar to load events.', now()),
    };
  }
  const timezone = options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const current = now();
  const timeMin = startOfLocalDay(current).toISOString();
  const timeMax = endOfLocalDay(current).toISOString();
  const query = new URLSearchParams({
    maxResults: '25',
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMax,
    timeMin,
    timeZone: timezone,
  });
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query.toString()}`,
      { headers: { Authorization: `Bearer ${options.accessToken}` } },
    );
  } catch {
    return {
      kind: 'error',
      error: error(
        'network-error',
        'Google Calendar could not be reached. Cached events remain available.',
        current,
      ),
    };
  }
  if (response.status === 401) {
    return {
      kind: 'error',
      error: error(
        'authorization-expired',
        'Google Calendar authorization expired. Reconnect to refresh events.',
        current,
      ),
    };
  }
  if (!response.ok) {
    return {
      kind: 'error',
      error: error(
        'calendar-api-error',
        'Google Calendar could not load events. Cached events remain available.',
        current,
      ),
    };
  }
  try {
    const body = (await response.json()) as unknown;
    const events =
      isRecord(body) && Array.isArray(body.items)
        ? body.items.flatMap(mapCalendarEvent).sort(compareCalendarEvents)
        : [];
    return { kind: 'success', context: { events, generatedAt: current.toISOString(), timezone } };
  } catch {
    return {
      kind: 'error',
      error: error('invalid-response', 'Google Calendar returned unreadable event data.', current),
    };
  }
}

export function readCalendarCachedContext(
  cache: IntegrationCacheState | undefined,
): CalendarContext | undefined {
  const value = cache?.entries.context?.value;
  return isCalendarContext(value) ? value : undefined;
}

export function saveCalendarCachedContext(
  cache: IntegrationCacheState,
  context: CalendarContext,
): IntegrationCacheState {
  return {
    entries: { ...cache.entries, context: { cachedAt: context.generatedAt, value: context } },
  };
}

export function getNextCalendarEvent(
  context: CalendarContext,
  now = new Date(),
): CalendarEvent | undefined {
  return context.events.find(
    (event) => !event.allDay && event.startAt && Date.parse(event.startAt) >= now.getTime(),
  );
}

export function getTodayCalendarEvents(context: CalendarContext): CalendarEvent[] {
  return [...context.events];
}

function mapCalendarEvent(value: unknown): CalendarEvent[] {
  if (!isRecord(value) || typeof value.id !== 'string') return [];
  const start: Record<string, unknown> = isRecord(value.start) ? value.start : {};
  const end: Record<string, unknown> = isRecord(value.end) ? value.end : {};
  const startDate = typeof start.date === 'string' ? start.date : undefined;
  const endDate = typeof end.date === 'string' ? end.date : undefined;
  const allDay = startDate !== undefined;
  const startAt =
    typeof start.dateTime === 'string' ? start.dateTime : allDay ? startDate : undefined;
  const endAt = typeof end.dateTime === 'string' ? end.dateTime : allDay ? endDate : undefined;
  if (!startAt) return [];
  return [
    {
      allDay,
      ...(endAt ? { endAt } : {}),
      ...(typeof value.htmlLink === 'string' && isSafeUrl(value.htmlLink)
        ? { htmlLink: value.htmlLink }
        : {}),
      id: value.id,
      startAt,
      title:
        typeof value.summary === 'string' && value.summary.trim()
          ? value.summary.trim().slice(0, 300)
          : 'Untitled event',
    },
  ];
}

function compareCalendarEvents(left: CalendarEvent, right: CalendarEvent): number {
  if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
  return (left.startAt ?? '').localeCompare(right.startAt ?? '');
}

function startOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function endOfLocalDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1);
}

function isCalendarContext(value: unknown): value is CalendarContext {
  return (
    isRecord(value) &&
    typeof value.generatedAt === 'string' &&
    typeof value.timezone === 'string' &&
    Array.isArray(value.events) &&
    value.events.every(isCalendarEvent)
  );
}

function isCalendarEvent(value: unknown): value is CalendarEvent {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.allDay === 'boolean' &&
    (value.startAt === undefined || typeof value.startAt === 'string') &&
    (value.endAt === undefined || typeof value.endAt === 'string') &&
    (value.htmlLink === undefined ||
      (typeof value.htmlLink === 'string' && isSafeUrl(value.htmlLink)))
  );
}

function error(code: string, message: string, now: Date): IntegrationError {
  return { code, message, occurredAt: now.toISOString() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
