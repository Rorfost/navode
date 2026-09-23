# Navode v9 to v10 Migration Guide

Navode v2.2 introduces the Platform API and Plugin Manager. This required a schema migration from v9 to v10.

## What Changed?

The `NavodeSettings` schema now includes two new fields:

1. `installedPlugins: PluginRegistryEntry[]` - An array of plugins installed by the user.
2. `activeThemePlugin?: string` - The ID of the currently active theme plugin (if any).

## Automatic Migration

The Navode core handles migrations automatically. When a user opens Navode v2.2 for the first time, `migrateV9Settings(v9)` is called to inject these fields.

```typescript
export function migrateV9Settings(v9: unknown): NavodeSettings {
  const settings = v9 as NavodeSettings;
  return {
    ...settings,
    schemaVersion: 10,
    installedPlugins: settings.installedPlugins ?? [],
    activeThemePlugin: settings.activeThemePlugin ?? undefined,
  };
}
```

No user action is required. If you are developing locally, ensure you test the migration path by loading a v9 backup JSON via the Settings UI.
