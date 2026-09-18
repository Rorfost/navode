import {
  DEFAULT_NAVODE_SETTINGS,
  NAVODE_STORAGE_SCHEMA_VERSION,
  parseNavodeSettings,
} from '../src/index';

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
    ).toMatchObject({ theme: 'light', onboardingCompleted: true, defaultSearchProvider: 'youtube' });
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
    expect(settings).toMatchObject({ schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION, scratchpad: { content: '' }, snippets: [], todayItems: [] });
  });
});
