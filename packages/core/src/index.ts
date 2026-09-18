import { createCommandAlias, MAX_RECENT_EXECUTIONS, type CommandAlias, type RecentExecution } from './command-engine';

export type CommandKind = 'url' | 'search' | 'project' | 'focus';

export const NAVODE_STORAGE_SCHEMA_VERSION = 1;
export const NAVODE_SETTINGS_STORAGE_KEY = 'navode.settings';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DefaultSearchProvider = 'google' | 'youtube';

export interface StoredSettings {
  schemaVersion: typeof NAVODE_STORAGE_SCHEMA_VERSION;
}

export interface NavodeSettings extends StoredSettings {
  theme: ThemePreference;
  onboardingCompleted: boolean;
  defaultSearchProvider: DefaultSearchProvider;
  initialQuickLinks: boolean;
  customAliases: CommandAlias[];
  recentExecutions: RecentExecution[];
}

export const DEFAULT_NAVODE_SETTINGS: NavodeSettings = {
  schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
  theme: 'system',
  onboardingCompleted: false,
  defaultSearchProvider: 'google',
  initialQuickLinks: true,
  customAliases: [],
  recentExecutions: [],
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
    defaultSearchProvider: isDefaultSearchProvider(value.defaultSearchProvider)
      ? value.defaultSearchProvider
      : DEFAULT_NAVODE_SETTINGS.defaultSearchProvider,
    initialQuickLinks:
      typeof value.initialQuickLinks === 'boolean'
        ? value.initialQuickLinks
        : DEFAULT_NAVODE_SETTINGS.initialQuickLinks,
    customAliases: parseCustomAliases(value.customAliases),
    recentExecutions: parseRecentExecutions(value.recentExecutions),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system';
}

function isDefaultSearchProvider(value: unknown): value is DefaultSearchProvider {
  return value === 'google' || value === 'youtube';
}

function parseCustomAliases(value: unknown): CommandAlias[] {
  if (!Array.isArray(value)) return [];
  const aliases: CommandAlias[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.id !== 'string') continue;
    const alias = createCommandAlias(
      {
        alias: typeof candidate.alias === 'string' ? candidate.alias : '',
        label: typeof candidate.label === 'string' ? candidate.label : '',
        urlTemplate: typeof candidate.urlTemplate === 'string' ? candidate.urlTemplate : '',
      },
      candidate.id,
    );
    if (alias && !aliases.some((existing) => existing.alias === alias.alias)) aliases.push(alias);
  }
  return aliases;
}

function parseRecentExecutions(value: unknown): RecentExecution[] {
  if (!Array.isArray(value)) return [];
  const validActionTypes = new Set(['open-url', 'open-view', 'run-snippet', 'start-focus', 'export-data', 'show-help']);
  return value
    .filter(
      (candidate): candidate is Record<string, unknown> =>
        isRecord(candidate) &&
        typeof candidate.id === 'string' &&
        typeof candidate.label === 'string' &&
        typeof candidate.performedAt === 'string' &&
        typeof candidate.actionType === 'string' &&
        validActionTypes.has(candidate.actionType),
    )
    .slice(0, MAX_RECENT_EXECUTIONS)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.label,
      performedAt: candidate.performedAt,
      actionType: candidate.actionType as RecentExecution['actionType'],
    }));
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

export {
  BUILT_IN_SEARCH_PROVIDERS,
  MAX_RECENT_EXECUTIONS,
  clearRecentExecutions,
  createCommandAlias,
  getCommandResults,
  isSafeExternalUrl,
  parseCommandInput,
  recordRecentExecution,
  removeCommandAlias,
  resolveCommand,
  type CommandAction,
  type CommandAlias,
  type CommandCatalog,
  type CommandResult,
  type NewCommandAlias,
  type RecentExecution,
  type SearchProvider,
  type SearchProviderId,
} from './command-engine';
