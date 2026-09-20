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

  it('migrates v6 settings with a safe empty Codeforces configuration', () => {
    const settings = parseNavodeSettings({ ...DEFAULT_NAVODE_SETTINGS, schemaVersion: 6 });
    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      competitiveProgramming: { showWidget: true },
    });
    expect(settings.competitiveProgramming.codeforcesHandle).toBeUndefined();
  });

  it('migrates v7 settings and validates bounded project health targets', () => {
    const settings = parseNavodeSettings({
      ...DEFAULT_NAVODE_SETTINGS,
      schemaVersion: 7,
      projectHealthTargets: [
        {
          id: 'api',
          label: 'API',
          projectId: 'navode',
          url: 'https://example.com/health',
          expectedStatus: 200,
        },
        { id: 'unsafe', label: 'Unsafe', url: 'data:text/plain,no', expectedStatus: 200 },
      ],
    });
    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      projectHealthTargets: [{ id: 'api', expectedStatus: 200 }],
    });
  });

  it('migrates V2.5 settings with all live widgets disabled until the user opts in', () => {
    const settings = parseNavodeSettings({ ...DEFAULT_NAVODE_SETTINGS, schemaVersion: 8 });
    expect(settings).toMatchObject({
      schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
      integrationWidgets: {
        calendar: false,
        competitiveProgramming: false,
        github: false,
        projectHealth: false,
      },
    });
  });

  it('retains only explicit boolean live-widget preferences', () => {
    const settings = parseNavodeSettings({
      ...DEFAULT_NAVODE_SETTINGS,
      integrationWidgets: { calendar: true, github: true, projectHealth: 'yes' },
    });
    expect(settings.integrationWidgets).toEqual({
      calendar: true,
      competitiveProgramming: false,
      github: true,
      projectHealth: false,
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
