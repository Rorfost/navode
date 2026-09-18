export type CommandKind = 'url' | 'search' | 'project' | 'focus';

export const NAVODE_STORAGE_SCHEMA_VERSION = 1;
export const NAVODE_SETTINGS_STORAGE_KEY = 'navode.settings';

export type ThemePreference = 'dark' | 'light' | 'system';
export type SearchProvider = 'google' | 'youtube';

export interface StoredSettings {
  schemaVersion: typeof NAVODE_STORAGE_SCHEMA_VERSION;
}

export interface NavodeSettings extends StoredSettings {
  theme: ThemePreference;
  onboardingCompleted: boolean;
  defaultSearchProvider: SearchProvider;
  initialQuickLinks: boolean;
}

export const DEFAULT_NAVODE_SETTINGS: NavodeSettings = {
  schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
  theme: 'system',
  onboardingCompleted: false,
  defaultSearchProvider: 'google',
  initialQuickLinks: true,
};

/** Returns safe defaults when locally persisted settings are incomplete or from another schema. */
export function parseNavodeSettings(value: unknown): NavodeSettings {
  if (!isRecord(value) || value.schemaVersion !== NAVODE_STORAGE_SCHEMA_VERSION) {
    return DEFAULT_NAVODE_SETTINGS;
  }

  return {
    schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
    theme: isThemePreference(value.theme) ? value.theme : DEFAULT_NAVODE_SETTINGS.theme,
    onboardingCompleted:
      typeof value.onboardingCompleted === 'boolean'
        ? value.onboardingCompleted
        : DEFAULT_NAVODE_SETTINGS.onboardingCompleted,
    defaultSearchProvider: isSearchProvider(value.defaultSearchProvider)
      ? value.defaultSearchProvider
      : DEFAULT_NAVODE_SETTINGS.defaultSearchProvider,
    initialQuickLinks:
      typeof value.initialQuickLinks === 'boolean'
        ? value.initialQuickLinks
        : DEFAULT_NAVODE_SETTINGS.initialQuickLinks,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function isSearchProvider(value: unknown): value is SearchProvider {
  return value === 'google' || value === 'youtube';
}

export interface Command {
  id: string;
  label: string;
  kind: CommandKind;
  template: string;
  aliases: string[];
}

export interface ParsedCommand {
  name: string;
  argument: string;
}

/** Splits a keyboard command into its first token and remaining argument. */
export function parseCommand(input: string): ParsedCommand | null {
  const normalized = input.trim();
  if (!normalized) return null;
  const [name = '', ...rest] = normalized.split(/\s+/);
  return { name: name.toLowerCase(), argument: rest.join(' ') };
}

export function findCommand(commands: readonly Command[], input: string): Command | null {
  const parsed = parseCommand(input);
  if (!parsed) return null;
  return (
    commands.find(
      (command) =>
        command.label.toLowerCase() === parsed.name ||
        command.aliases.some((alias) => alias.toLowerCase() === parsed.name),
    ) ?? null
  );
}
