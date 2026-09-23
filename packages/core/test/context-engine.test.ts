import { describe, expect, it } from 'vitest';
import { generateContextSuggestions } from '../src/context-engine';

describe('Context Engine', () => {
  it('generates suggestions based on active focus timer and calendar event', () => {
    const suggestions = generateContextSuggestions(
      {
        activeFocusTimer: {
          durationMinutes: 25,
          remainingSeconds: 600,
          status: 'running',
        },
        upcomingCalendarEventTitle: 'Team Sync Meeting',
        upcomingCalendarEventTime: '10:00 AM',
      },
      new Date('2026-09-24T09:30:00Z'),
    );

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]!.id).toBe('sugg-active-focus');
    expect(suggestions[1]!.title).toContain('Team Sync Meeting');
  });
});
