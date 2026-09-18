export const MAX_TODAY_ITEMS = 3;

export interface Scratchpad {
  content: string;
}

export interface Snippet {
  alias?: string;
  content: string;
  id: string;
  tags: string[];
  title: string;
}

export interface SnippetInput {
  alias?: string | undefined;
  content: string;
  tags?: readonly string[] | undefined;
  title: string;
}

export interface TodayItem {
  completed: boolean;
  id: string;
  title: string;
}

export interface FocusTimer {
  durationMinutes: number;
  endsAt?: string;
  remainingSeconds: number;
  status: 'idle' | 'running' | 'paused' | 'completed';
}

export interface FocusTimerSnapshot {
  remainingSeconds: number;
  status: FocusTimer['status'];
}

export const DEFAULT_FOCUS_TIMER: FocusTimer = {
  durationMinutes: 25,
  remainingSeconds: 25 * 60,
  status: 'idle',
};

export const DEFAULT_SCRATCHPAD: Scratchpad = { content: '' };

export function createSnippet(input: SnippetInput, id: string): Snippet | null {
  const title = input.title.trim();
  const content = input.content;
  const alias = normalizeAlias(input.alias);
  if (!title || !content.trim() || (input.alias && !alias)) return null;
  return { ...(alias ? { alias } : {}), content, id, tags: normalizeTags(input.tags), title };
}

export function saveSnippet(snippets: readonly Snippet[], snippet: Snippet): Snippet[] {
  return snippets.some((candidate) => candidate.id === snippet.id)
    ? snippets.map((candidate) => (candidate.id === snippet.id ? snippet : candidate))
    : [...snippets, snippet];
}

export function removeSnippet(snippets: readonly Snippet[], id: string): Snippet[] {
  return snippets.filter((snippet) => snippet.id !== id);
}

export function searchSnippets(snippets: readonly Snippet[], query: string): Snippet[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...snippets];
  return snippets.filter((snippet) =>
    [snippet.title, snippet.alias ?? '', snippet.content, ...snippet.tags].some((value) => value.toLowerCase().includes(normalized)),
  );
}

export function addTodayItem(items: readonly TodayItem[], title: string, id: string): TodayItem[] | null {
  const normalized = title.trim();
  if (!normalized || items.length >= MAX_TODAY_ITEMS) return null;
  return [...items, { completed: false, id, title: normalized }];
}

export function updateTodayItem(items: readonly TodayItem[], id: string, title: string): TodayItem[] | null {
  const normalized = title.trim();
  if (!normalized || !items.some((item) => item.id === id)) return null;
  return items.map((item) => (item.id === id ? { ...item, title: normalized } : item));
}

export function toggleTodayItem(items: readonly TodayItem[], id: string): TodayItem[] {
  return items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
}

export function clearTodayItems(): TodayItem[] {
  return [];
}

export function startFocusTimer(durationMinutes: number, now = new Date()): FocusTimer | null {
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 180) return null;
  const remainingSeconds = durationMinutes * 60;
  return {
    durationMinutes,
    endsAt: new Date(now.getTime() + remainingSeconds * 1000).toISOString(),
    remainingSeconds,
    status: 'running',
  };
}

export function getFocusTimerSnapshot(timer: FocusTimer, now = new Date()): FocusTimerSnapshot {
  if (timer.status !== 'running' || !timer.endsAt) return { remainingSeconds: timer.remainingSeconds, status: timer.status };
  const remainingSeconds = Math.max(0, Math.ceil((new Date(timer.endsAt).getTime() - now.getTime()) / 1000));
  return { remainingSeconds, status: remainingSeconds === 0 ? 'completed' : 'running' };
}

export function pauseFocusTimer(timer: FocusTimer, now = new Date()): FocusTimer {
  const snapshot = getFocusTimerSnapshot(timer, now);
  if (snapshot.status === 'completed') return { ...timer, endsAt: undefined, remainingSeconds: 0, status: 'completed' };
  return { ...timer, endsAt: undefined, remainingSeconds: snapshot.remainingSeconds, status: 'paused' };
}

export function resumeFocusTimer(timer: FocusTimer, now = new Date()): FocusTimer | null {
  if (timer.status !== 'paused' || timer.remainingSeconds < 1) return null;
  return { ...timer, endsAt: new Date(now.getTime() + timer.remainingSeconds * 1000).toISOString(), status: 'running' };
}

export function resetFocusTimer(timer: FocusTimer): FocusTimer {
  return { durationMinutes: timer.durationMinutes, remainingSeconds: timer.durationMinutes * 60, status: 'idle' };
}

function normalizeTags(tags: readonly string[] | undefined): string[] {
  if (!tags) return [];
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}

function normalizeAlias(value: string | undefined): string | undefined {
  const alias = value?.trim().toLowerCase();
  return alias && /^[a-z0-9][a-z0-9-]{0,31}$/.test(alias) ? alias : undefined;
}
