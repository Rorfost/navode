import type { Project, Workspace } from './organization';
import type { FocusTimer } from './productivity';

export interface ContextInputData {
  activeWorkspaceId?: string;
  activeFocusTimer?: FocusTimer;
  currentProject?: Project;
  upcomingCalendarEventTitle?: string;
  upcomingCalendarEventTime?: string;
  codeforcesContestName?: string;
  codeforcesContestTime?: string;
  workingHoursStart?: number; // e.g., 9 (9 AM)
  workingHoursEnd?: number; // e.g., 17 (5 PM)
}

export interface ContextSuggestion {
  id: string;
  title: string;
  description: string;
  icon: string;
  actionKind: 'run-workflow' | 'launch-workspace' | 'focus-timer' | 'open-url';
  actionTarget: string;
  category: 'focus' | 'calendar' | 'project' | 'contest' | 'routine';
  score: number;
}

export function generateContextSuggestions(
  input: ContextInputData,
  now = new Date(),
): ContextSuggestion[] {
  const suggestions: ContextSuggestion[] = [];
  const hour = now.getHours();

  // Focus Suggestion
  if (input.activeFocusTimer?.status === 'running') {
    suggestions.push({
      id: 'sugg-active-focus',
      title: 'Resume Focus Session',
      description: `Focus timer active (${input.activeFocusTimer.remainingSeconds}s remaining).`,
      icon: 'zap',
      actionKind: 'focus-timer',
      actionTarget: 'resume',
      category: 'focus',
      score: 100,
    });
  }

  // Calendar Event Suggestion
  if (input.upcomingCalendarEventTitle) {
    suggestions.push({
      id: 'sugg-calendar-event',
      title: `Upcoming: ${input.upcomingCalendarEventTitle}`,
      description: input.upcomingCalendarEventTime
        ? `Starts at ${input.upcomingCalendarEventTime}`
        : 'Starting soon on your calendar.',
      icon: 'calendar',
      actionKind: 'open-url',
      actionTarget: 'https://calendar.google.com',
      category: 'calendar',
      score: 90,
    });
  }

  // CP Contest Suggestion
  if (input.codeforcesContestName) {
    suggestions.push({
      id: 'sugg-cp-contest',
      title: `Codeforces Contest: ${input.codeforcesContestName}`,
      description: input.codeforcesContestTime || 'Contest starting soon.',
      icon: 'code',
      actionKind: 'open-url',
      actionTarget: 'https://codeforces.com/contests',
      category: 'contest',
      score: 85,
    });
  }

  // Active Project Continuation Suggestion
  if (input.currentProject) {
    const projectUrl = input.currentProject.actions[0]?.url || 'https://github.com';
    suggestions.push({
      id: `sugg-project-${input.currentProject.id}`,
      title: `Continue ${input.currentProject.name}`,
      description: 'Quick open primary repository and project links.',
      icon: 'folder',
      actionKind: 'open-url',
      actionTarget: projectUrl,
      category: 'project',
      score: 75,
    });
  }

  // Morning Setup Routine
  if (hour >= (input.workingHoursStart ?? 8) && hour <= 10) {
    suggestions.push({
      id: 'sugg-morning-routine',
      title: 'Run Morning Setup',
      description: "Sync calendar, check GitHub PRs, set today's top 3 items.",
      icon: 'sun',
      actionKind: 'run-workflow',
      actionTarget: 'template-morning-setup',
      category: 'routine',
      score: 70,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score);
}
