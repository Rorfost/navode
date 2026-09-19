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

  it('migrates v3 productivity settings to current personalization defaults', () => {
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

  it('migrates v4 settings to empty non-secret integration state', () => {
    const settings = parseNavodeSettings({
      schemaVersion: 4,
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
      integrationCache: {},
      integrations: {},
      scratchpad: { content: 'Keep this note.' },
    });
  });

  it('migrates v5 settings while retaining a valid GitHub project reference', () => {
    const settings = parseNavodeSettings({
      ...DEFAULT_NAVODE_SETTINGS,
      schemaVersion: 5,
      projects: [
        {
          id: 'navode',
          name: 'Navode',
          actions: [],
          showOnHome: true,
          githubRepository: 'Rorfost/navode',
        },
      ],
    });

    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      projects: [{ githubRepository: 'Rorfost/navode' }],
    });
  });

  it('drops malformed integration cache entries and unknown providers', () => {
    const settings = parseNavodeSettings({
      ...DEFAULT_NAVODE_SETTINGS,
      integrations: {
        github: { enabled: true, status: 'connected', grantedPermissionIds: ['unrequested'] },
        unknown: { enabled: true, status: 'connected', grantedPermissionIds: [] },
      },
      integrationCache: {
        github: {
          entries: {
            activity: { cachedAt: '2026-09-19T10:00:00.000Z', value: { count: 1 } },
            invalid: { cachedAt: 'not-a-date', value: {} },
          },
        },
      },
    });

    expect(settings.integrations).toEqual({
      github: { enabled: true, status: 'connected', grantedPermissionIds: [] },
    });
    expect(settings.integrationCache.github?.entries).toEqual({
      activity: { cachedAt: '2026-09-19T10:00:00.000Z', value: { count: 1 } },
    });
  });
});
