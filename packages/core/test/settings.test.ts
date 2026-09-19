import {
  DEFAULT_NAVODE_SETTINGS,
  NAVODE_STORAGE_SCHEMA_VERSION,
  parseNavodeSettings,
} from '../src/index';

import { describe, expect, it } from 'vitest';

describe('parseNavodeSettings', () => {
  it('keeps valid persisted preferences', () => {
    expect(
      parseNavodeSettings({
        schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
        theme: 'light',
        onboardingCompleted: true,
        defaultSearchProvider: 'youtube',
        initialQuickLinks: false,
      }),
    ).toMatchObject({
      theme: 'light',
      onboardingCompleted: true,
      defaultSearchProvider: 'youtube',
    });
  });

  it('uses safe defaults for an unknown schema', () => {
    expect(parseNavodeSettings({ schemaVersion: 99 })).toEqual(DEFAULT_NAVODE_SETTINGS);
  });

  it('migrates v2 settings without discarding existing organization data', () => {
    const settings = parseNavodeSettings({
      schemaVersion: 2,
      theme: 'dark',
      quickLinks: [],
      projects: [],
      workspaces: [],
      customAliases: [],
      recentExecutions: [],
    });
    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      scratchpad: { content: '' },
      snippets: [],
      todayItems: [],
    });
  });

  it('migrates v3 productivity settings to v4 personalization defaults', () => {
    const settings = parseNavodeSettings({
      schemaVersion: 3,
      theme: 'dark',
      onboardingCompleted: true,
      defaultSearchProvider: 'google',
      initialQuickLinks: false,
      customAliases: [],
      projects: [],
      quickLinks: [],
      recentExecutions: [],
      scratchpad: { content: 'Keep this note.' },
      snippets: [],
      focusTimer: { durationMinutes: 25, remainingSeconds: 1500, status: 'paused' },
      todayItems: [],
      workspaces: [],
    });

    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      scratchpad: { content: 'Keep this note.' },
      focusPresets: [25, 50, 60],
      homeSections: { quickAccess: true, projects: true, workspaces: true, productivity: true },
      reducedMotion: 'system',
    });
  });
});
