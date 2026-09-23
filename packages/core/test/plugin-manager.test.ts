import { describe, expect, it } from 'vitest';
import {
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  getGrantedCapabilities,
  hasCapability,
  setActiveThemePlugin,
} from '../src/plugin-manager';
import { DEFAULT_NAVODE_SETTINGS, migrateV9Settings } from '../src/index';
import { NAVODE_STORAGE_SCHEMA_VERSION } from '../src/index';
import type { PluginRegistryEntry, NavodeExtensionManifest } from '@navode/platform-sdk';

const VALID_MANIFEST: NavodeExtensionManifest = {
  id: 'com.example.test',
  name: 'Test Plugin',
  publisher: 'Test Publisher',
  version: '1.0.0',
  description: 'A test plugin',
  platformApiVersion: '1',
  capabilities: ['commands', 'theme'],
  commands: [
    {
      alias: 'test',
      label: 'Test Command',
      description: 'Opens test page',
      url: 'https://example.com',
    },
  ],
  themes: [
    {
      id: 'theme1',
      name: 'Theme 1',
      tokens: { '--background': '#000' },
    },
  ],
};

const TEST_ENTRY: PluginRegistryEntry = {
  id: VALID_MANIFEST.id,
  name: VALID_MANIFEST.name,
  publisher: VALID_MANIFEST.publisher,
  version: VALID_MANIFEST.version,
  description: VALID_MANIFEST.description,
  capabilities: VALID_MANIFEST.capabilities,
  compatiblePlatformApiVersion: VALID_MANIFEST.platformApiVersion,
  integrityHash: 'abc',
  status: 'official',
  enabled: false,
  installedAt: new Date().toISOString(),
  manifest: VALID_MANIFEST,
};

describe('plugin-manager', () => {
  it('enables a valid plugin', () => {
    const result = enablePlugin(DEFAULT_NAVODE_SETTINGS, TEST_ENTRY);
    expect(result.success).toBe(true);
    expect(result.settings?.installedPlugins).toHaveLength(1);
    expect(result.settings?.installedPlugins[0]?.enabled).toBe(true);
  });

  it('fails if plugin already installed', () => {
    const settings = {
      ...DEFAULT_NAVODE_SETTINGS,
      installedPlugins: [TEST_ENTRY],
    };
    const result = enablePlugin(settings, TEST_ENTRY);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/already installed/);
  });

  it('fails if incompatible platform version', () => {
    const entry = { ...TEST_ENTRY, compatiblePlatformApiVersion: '99' };
    const result = enablePlugin(DEFAULT_NAVODE_SETTINGS, entry);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/targets Platform API/);
  });

  it('disables a plugin', () => {
    const enabledEntry = { ...TEST_ENTRY, enabled: true };
    const settings = {
      ...DEFAULT_NAVODE_SETTINGS,
      installedPlugins: [enabledEntry],
      activeThemePlugin: enabledEntry.id,
    };
    const result = disablePlugin(settings, enabledEntry.id);
    expect(result.installedPlugins[0]?.enabled).toBe(false);
    expect(result.activeThemePlugin).toBeNull();
  });

  it('uninstalls a plugin', () => {
    const enabledEntry = { ...TEST_ENTRY, enabled: true };
    const settings = {
      ...DEFAULT_NAVODE_SETTINGS,
      installedPlugins: [enabledEntry],
      activeThemePlugin: enabledEntry.id,
    };
    const result = uninstallPlugin(settings, enabledEntry.id);
    expect(result.installedPlugins).toHaveLength(0);
    expect(result.activeThemePlugin).toBeNull();
  });

  describe('capabilities', () => {
    it('returns empty set if disabled', () => {
      const entry = { ...TEST_ENTRY, enabled: false };
      expect(getGrantedCapabilities(entry).size).toBe(0);
      expect(hasCapability(entry, 'commands')).toBe(false);
    });

    it('returns capabilities if enabled', () => {
      const entry = { ...TEST_ENTRY, enabled: true };
      expect(getGrantedCapabilities(entry).has('commands')).toBe(true);
      expect(hasCapability(entry, 'commands')).toBe(true);
      expect(hasCapability(entry, 'widgets')).toBe(false);
    });
  });

  describe('setActiveThemePlugin', () => {
    it('sets active theme if plugin valid and enabled', () => {
      const enabledEntry = { ...TEST_ENTRY, enabled: true };
      const settings = {
        ...DEFAULT_NAVODE_SETTINGS,
        installedPlugins: [enabledEntry],
      };
      const result = setActiveThemePlugin(settings, enabledEntry.id);
      expect(result.error).toBeUndefined();
      expect(result.settings.activeThemePlugin).toBe(enabledEntry.id);
    });

    it('fails if plugin disabled', () => {
      const settings = {
        ...DEFAULT_NAVODE_SETTINGS,
        installedPlugins: [TEST_ENTRY],
      };
      const result = setActiveThemePlugin(settings, TEST_ENTRY.id);
      expect(result.error).toMatch(/not enabled/);
    });

    it('fails if plugin lacks theme capability', () => {
      const noThemeEntry: PluginRegistryEntry = {
        ...TEST_ENTRY,
        enabled: true,
        capabilities: ['commands'],
        manifest: { ...VALID_MANIFEST, capabilities: ['commands'] },
      };
      const settings = {
        ...DEFAULT_NAVODE_SETTINGS,
        installedPlugins: [noThemeEntry],
      };
      const result = setActiveThemePlugin(settings, noThemeEntry.id);
      expect(result.error).toMatch(/does not have the "theme" capability/);
    });

    it('clears active theme if null provided', () => {
      const settings = {
        ...DEFAULT_NAVODE_SETTINGS,
        activeThemePlugin: 'some-id',
      };
      const result = setActiveThemePlugin(settings, null);
      expect(result.error).toBeUndefined();
      expect(result.settings.activeThemePlugin).toBeNull();
    });
  });
});

describe('schema migrations', () => {
  it('migrateV9Settings adds plugin fields and updates schema version', () => {
    const v9Data = {
      schemaVersion: 9,
      workflows: [],
    };
    const result = migrateV9Settings(v9Data);
    expect(result.schemaVersion).toBe(NAVODE_STORAGE_SCHEMA_VERSION);
    expect(result.installedPlugins).toEqual([]);
    expect(result.activeThemePlugin).toBeNull();
  });
});
