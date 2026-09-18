import {
  MAX_TODAY_ITEMS,
  addTodayItem,
  createSnippet,
  getFocusTimerSnapshot,
  pauseFocusTimer,
  resumeFocusTimer,
  searchSnippets,
  startFocusTimer,
  toggleTodayItem,
  type TodayItem,
} from '../src/index';

describe('productivity utilities', () => {
  it('creates and searches snippets by title, tag, and alias', () => {
    const snippet = createSnippet({ alias: 'reply', content: 'Thanks for your message.', tags: ['Email'], title: 'Friendly reply' }, 'snippet-1');
    expect(snippet).not.toBeNull();
    expect(searchSnippets([snippet!], 'email')).toEqual([snippet]);
    expect(searchSnippets([snippet!], 'reply')).toEqual([snippet]);
  });

  it('calculates an active timer after refresh and supports pause/resume', () => {
    const started = startFocusTimer(25, new Date('2026-01-01T10:00:00.000Z'))!;
    expect(getFocusTimerSnapshot(started, new Date('2026-01-01T10:05:30.000Z'))).toEqual({ remainingSeconds: 1170, status: 'running' });
    const paused = pauseFocusTimer(started, new Date('2026-01-01T10:05:30.000Z'));
    expect(paused).toMatchObject({ remainingSeconds: 1170, status: 'paused' });
    expect(resumeFocusTimer(paused, new Date('2026-01-01T11:00:00.000Z'))?.endsAt).toBe('2026-01-01T11:19:30.000Z');
  });

  it('limits today to three items and preserves completion state', () => {
    let items: TodayItem[] = [];
    for (let index = 0; index < MAX_TODAY_ITEMS; index += 1) items = addTodayItem(items, `Priority ${index}`, `today-${index}`)!;
    expect(addTodayItem(items, 'Too many', 'today-4')).toBeNull();
    expect(toggleTodayItem(items, 'today-1')[1]).toMatchObject({ completed: true, title: 'Priority 1' });
  });
});
