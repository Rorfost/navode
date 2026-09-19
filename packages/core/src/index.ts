import {
  createCommandAlias,
  MAX_RECENT_EXECUTIONS,
  type CommandAlias,
  type RecentExecution,
} from './command-engine';
import {
  createProject,
  createProjectAction,
  createQuickLink,
  createStarterQuickLinks,
  createWorkspace,
  createWorkspaceItem,
  type Project,
  type ProjectActionKind,
  type QuickLink,
  type Workspace,
} from './organization';
import {
  DEFAULT_FOCUS_TIMER,
  DEFAULT_SCRATCHPAD,
  type FocusTimer,
  type Scratchpad,
  type Snippet,
  type TodayItem,
  createSnippet,
} from './productivity';
import {
  NAVODE_INTEGRATIONS,
  type IntegrationCacheState,
  type IntegrationConnection,
  type IntegrationId,
} from '@navode/integrations';

export type CommandKind = 'url' | 'search' | 'project' | 'focus';

export const NAVODE_STORAGE_SCHEMA_VERSION = 5;
export const NAVODE_SETTINGS_STORAGE_KEY = 'navode.settings';

export type ThemePreference = 'dark' | 'light' | 'system';
export type DefaultSearchProvider = 'google' | 'youtube';
export type ReducedMotionPreference = 'system' | 'reduce';

export interface HomeSections {
  productivity: boolean;
  projects: boolean;
  quickAccess: boolean;
  workspaces: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSections = {
  productivity: true,
  projects: true,
  quickAccess: true,
  workspaces: true,
};

export const DEFAULT_FOCUS_PRESETS = [25, 50, 60];

export interface StoredSettings {
  schemaVersion: typeof NAVODE_STORAGE_SCHEMA_VERSION;
}

export interface NavodeSettings extends StoredSettings {
  theme: ThemePreference;
  onboardingCompleted: boolean;
  defaultSearchProvider: DefaultSearchProvider;
  initialQuickLinks: boolean;
  integrationCache: Partial<Record<IntegrationId, IntegrationCacheState>>;
  integrations: Partial<Record<IntegrationId, IntegrationConnection>>;
  customAliases: CommandAlias[];
  projects: Project[];
  quickLinks: QuickLink[];
  recentExecutions: RecentExecution[];
  scratchpad: Scratchpad;
  snippets: Snippet[];
  focusTimer: FocusTimer;
  focusPresets: number[];
  homeSections: HomeSections;
  recordRecentActions: boolean;
  reducedMotion: ReducedMotionPreference;
  todayItems: TodayItem[];
  workspaces: Workspace[];
}

export const DEFAULT_NAVODE_SETTINGS: NavodeSettings = {
  schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
  theme: 'system',
  onboardingCompleted: false,
  defaultSearchProvider: 'google',
  initialQuickLinks: true,
  integrationCache: {},
  integrations: {},
  customAliases: [],
  projects: [],
  quickLinks: createStarterQuickLinks(),
  recentExecutions: [],
  scratchpad: DEFAULT_SCRATCHPAD,
  snippets: [],
  focusTimer: DEFAULT_FOCUS_TIMER,
  focusPresets: DEFAULT_FOCUS_PRESETS,
  homeSections: DEFAULT_HOME_SECTIONS,
  recordRecentActions: true,
  reducedMotion: 'system',
  todayItems: [],
  workspaces: [],
};

/** Migrates supported local schemas and returns safe defaults for malformed or unknown data. */
export function parseNavodeSettings(value: unknown): NavodeSettings {
  if (!isRecord(value)) return DEFAULT_NAVODE_SETTINGS;
  if (value.schemaVersion === 1) return migrateV1Settings(value);
  if (value.schemaVersion === 2) return migrateV2Settings(value);
  if (value.schemaVersion === 3) return migrateV3Settings(value);
  if (value.schemaVersion === 4) return migrateV4Settings(value);
  if (value.schemaVersion !== NAVODE_STORAGE_SCHEMA_VERSION) return DEFAULT_NAVODE_SETTINGS;

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
    integrationCache: parseIntegrationCache(value.integrationCache),
    integrations: parseIntegrationConnections(value.integrations),
    customAliases: parseCustomAliases(value.customAliases),
    projects: parseProjects(value.projects),
    quickLinks: parseQuickLinks(value.quickLinks),
    recentExecutions: parseRecentExecutions(value.recentExecutions),
    scratchpad: parseScratchpad(value.scratchpad),
    snippets: parseSnippets(value.snippets),
    focusTimer: parseFocusTimer(value.focusTimer),
    focusPresets: parseFocusPresets(value.focusPresets),
    homeSections: parseHomeSections(value.homeSections),
    recordRecentActions:
      typeof value.recordRecentActions === 'boolean' ? value.recordRecentActions : true,
    reducedMotion: isReducedMotionPreference(value.reducedMotion) ? value.reducedMotion : 'system',
    todayItems: parseTodayItems(value.todayItems),
    workspaces: parseWorkspaces(value.workspaces),
  };
}

export function migrateV1Settings(value: Record<string, unknown>): NavodeSettings {
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
    integrationCache: {},
    integrations: {},
    customAliases: parseCustomAliases(value.customAliases),
    projects: [],
    quickLinks: value.initialQuickLinks === false ? [] : createStarterQuickLinks(),
    recentExecutions: parseRecentExecutions(value.recentExecutions),
    scratchpad: DEFAULT_SCRATCHPAD,
    snippets: [],
    focusTimer: DEFAULT_FOCUS_TIMER,
    focusPresets: DEFAULT_FOCUS_PRESETS,
    homeSections: DEFAULT_HOME_SECTIONS,
    recordRecentActions: true,
    reducedMotion: 'system',
    todayItems: [],
    workspaces: [],
  };
}

export function migrateV2Settings(value: Record<string, unknown>): NavodeSettings {
  return {
    ...parseV2Base(value),
    schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
    integrationCache: {},
    integrations: {},
    scratchpad: DEFAULT_SCRATCHPAD,
    snippets: [],
    focusTimer: DEFAULT_FOCUS_TIMER,
    focusPresets: DEFAULT_FOCUS_PRESETS,
    homeSections: DEFAULT_HOME_SECTIONS,
    recordRecentActions: true,
    reducedMotion: 'system',
    todayItems: [],
  };
}

export function migrateV3Settings(value: Record<string, unknown>): NavodeSettings {
  return {
    ...parseV3Base(value),
    schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
    integrationCache: {},
    integrations: {},
    focusPresets: DEFAULT_FOCUS_PRESETS,
    homeSections: DEFAULT_HOME_SECTIONS,
    recordRecentActions: true,
    reducedMotion: 'system',
  };
}

/** V2.1 adds non-secret connection metadata and provider caches; V1 data stays untouched. */
export function migrateV4Settings(value: Record<string, unknown>): NavodeSettings {
  return {
    ...parseV3Base(value),
    schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION,
    focusPresets: parseFocusPresets(value.focusPresets),
    homeSections: parseHomeSections(value.homeSections),
    recordRecentActions:
      typeof value.recordRecentActions === 'boolean' ? value.recordRecentActions : true,
    reducedMotion: isReducedMotionPreference(value.reducedMotion) ? value.reducedMotion : 'system',
    integrationCache: {},
    integrations: {},
  };
}

function parseV2Base(
  value: Record<string, unknown>,
): Omit<
  NavodeSettings,
  | 'schemaVersion'
  | 'scratchpad'
  | 'snippets'
  | 'focusTimer'
  | 'focusPresets'
  | 'homeSections'
  | 'recordRecentActions'
  | 'reducedMotion'
  | 'todayItems'
> {
  return {
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
    projects: parseProjects(value.projects),
    quickLinks: parseQuickLinks(value.quickLinks),
    recentExecutions: parseRecentExecutions(value.recentExecutions),
    workspaces: parseWorkspaces(value.workspaces),
  };
}

function parseV3Base(
  value: Record<string, unknown>,
): Omit<
  NavodeSettings,
  'schemaVersion' | 'focusPresets' | 'homeSections' | 'recordRecentActions' | 'reducedMotion'
> {
  return {
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
    projects: parseProjects(value.projects),
    quickLinks: parseQuickLinks(value.quickLinks),
    recentExecutions: parseRecentExecutions(value.recentExecutions),
    scratchpad: parseScratchpad(value.scratchpad),
    snippets: parseSnippets(value.snippets),
    focusTimer: parseFocusTimer(value.focusTimer),
    todayItems: parseTodayItems(value.todayItems),
    workspaces: parseWorkspaces(value.workspaces),
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

function isReducedMotionPreference(value: unknown): value is ReducedMotionPreference {
  return value === 'system' || value === 'reduce';
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
  const validActionTypes = new Set([
    'open-url',
    'open-view',
    'run-snippet',
    'launch-workspace',
    'start-focus',
    'export-data',
    'show-help',
  ]);
  const executions: RecentExecution[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) continue;
    const { actionType, id, label, performedAt } = candidate;
    if (
      typeof id !== 'string' ||
      typeof label !== 'string' ||
      typeof performedAt !== 'string' ||
      typeof actionType !== 'string' ||
      !validActionTypes.has(actionType)
    )
      continue;
    executions.push({
      actionType: actionType as RecentExecution['actionType'],
      id,
      label,
      performedAt,
    });
    if (executions.length === MAX_RECENT_EXECUTIONS) break;
  }
  return executions;
}

function parseQuickLinks(value: unknown): QuickLink[] {
  if (!Array.isArray(value)) return createStarterQuickLinks();
  const aliases = new Set<string>();
  return value
    .filter(isRecord)
    .sort((left, right) => numericValue(left.order) - numericValue(right.order))
    .flatMap((candidate, order) => {
      if (typeof candidate.id !== 'string') return [];
      const link = createQuickLink(
        {
          alias: typeof candidate.alias === 'string' ? candidate.alias : undefined,
          enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
          group: typeof candidate.group === 'string' ? candidate.group : undefined,
          icon: typeof candidate.icon === 'string' ? candidate.icon : undefined,
          name: typeof candidate.name === 'string' ? candidate.name : '',
          showOnHome: typeof candidate.showOnHome === 'boolean' ? candidate.showOnHome : true,
          url: typeof candidate.url === 'string' ? candidate.url : '',
        },
        candidate.id,
        order,
      );
      if (!link || (link.alias && aliases.has(link.alias))) return [];
      if (link.alias) aliases.add(link.alias);
      return [link];
    });
}

function parseProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== 'string') return [];
    const project = createProject(
      {
        description: typeof candidate.description === 'string' ? candidate.description : undefined,
        icon: typeof candidate.icon === 'string' ? candidate.icon : undefined,
        name: typeof candidate.name === 'string' ? candidate.name : '',
        showOnHome: typeof candidate.showOnHome === 'boolean' ? candidate.showOnHome : false,
      },
      candidate.id,
    );
    if (!project) return [];
    const actions = Array.isArray(candidate.actions)
      ? candidate.actions.flatMap((action) => {
          if (
            !isRecord(action) ||
            typeof action.id !== 'string' ||
            !isProjectActionKind(action.kind)
          )
            return [];
          const parsed = createProjectAction(
            {
              icon: typeof action.icon === 'string' ? action.icon : undefined,
              kind: action.kind,
              label: typeof action.label === 'string' ? action.label : '',
              url: typeof action.url === 'string' ? action.url : '',
            },
            action.id,
          );
          return parsed ? [parsed] : [];
        })
      : [];
    return [{ ...project, actions }];
  });
}

function parseWorkspaces(value: unknown): Workspace[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isRecord)
    .sort((left, right) => numericValue(left.order) - numericValue(right.order))
    .flatMap((candidate, order) => {
      if (typeof candidate.id !== 'string') return [];
      const workspace = createWorkspace(
        {
          description:
            typeof candidate.description === 'string' ? candidate.description : undefined,
          name: typeof candidate.name === 'string' ? candidate.name : '',
          showOnHome: typeof candidate.showOnHome === 'boolean' ? candidate.showOnHome : false,
        },
        candidate.id,
        order,
      );
      if (!workspace) return [];
      const items = Array.isArray(candidate.items)
        ? candidate.items.flatMap((item) => {
            if (!isRecord(item) || typeof item.id !== 'string') return [];
            const parsed = createWorkspaceItem(
              {
                label: typeof item.label === 'string' ? item.label : '',
                url: typeof item.url === 'string' ? item.url : '',
              },
              item.id,
            );
            return parsed ? [parsed] : [];
          })
        : [];
      return [{ ...workspace, items }];
    });
}

function parseScratchpad(value: unknown): Scratchpad {
  return isRecord(value) && typeof value.content === 'string'
    ? { content: value.content.slice(0, 20_000) }
    : DEFAULT_SCRATCHPAD;
}

function parseSnippets(value: unknown): Snippet[] {
  if (!Array.isArray(value)) return [];
  const aliases = new Set<string>();
  return value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.id !== 'string') return [];
    const snippet = createSnippet(
      {
        alias: typeof candidate.alias === 'string' ? candidate.alias : undefined,
        content: typeof candidate.content === 'string' ? candidate.content : '',
        tags: Array.isArray(candidate.tags)
          ? candidate.tags.filter((tag): tag is string => typeof tag === 'string')
          : [],
        title: typeof candidate.title === 'string' ? candidate.title : '',
      },
      candidate.id,
    );
    if (!snippet || (snippet.alias && aliases.has(snippet.alias))) return [];
    if (snippet.alias) aliases.add(snippet.alias);
    return [snippet];
  });
}

function parseFocusTimer(value: unknown): FocusTimer {
  if (
    !isRecord(value) ||
    typeof value.durationMinutes !== 'number' ||
    !Number.isInteger(value.durationMinutes) ||
    value.durationMinutes < 1 ||
    value.durationMinutes > 180 ||
    typeof value.remainingSeconds !== 'number' ||
    !Number.isInteger(value.remainingSeconds) ||
    value.remainingSeconds < 0
  )
    return DEFAULT_FOCUS_TIMER;
  const status = value.status;
  if (status !== 'idle' && status !== 'running' && status !== 'paused' && status !== 'completed')
    return DEFAULT_FOCUS_TIMER;
  const endsAt =
    typeof value.endsAt === 'string' && Number.isFinite(new Date(value.endsAt).getTime())
      ? value.endsAt
      : undefined;
  if (status === 'running' && !endsAt)
    return {
      ...DEFAULT_FOCUS_TIMER,
      durationMinutes: value.durationMinutes,
      remainingSeconds: value.durationMinutes * 60,
    };
  return {
    durationMinutes: value.durationMinutes,
    ...(endsAt ? { endsAt } : {}),
    remainingSeconds: value.remainingSeconds,
    status,
  };
}

function parseFocusPresets(value: unknown): number[] {
  if (!Array.isArray(value)) return DEFAULT_FOCUS_PRESETS;
  const presets = [
    ...new Set(
      value.filter(
        (duration): duration is number =>
          typeof duration === 'number' &&
          Number.isInteger(duration) &&
          duration >= 1 &&
          duration <= 180,
      ),
    ),
  ].slice(0, 5);
  return presets.length ? presets : DEFAULT_FOCUS_PRESETS;
}

function parseHomeSections(value: unknown): HomeSections {
  if (!isRecord(value)) return DEFAULT_HOME_SECTIONS;
  return {
    productivity: typeof value.productivity === 'boolean' ? value.productivity : true,
    projects: typeof value.projects === 'boolean' ? value.projects : true,
    quickAccess: typeof value.quickAccess === 'boolean' ? value.quickAccess : true,
    workspaces: typeof value.workspaces === 'boolean' ? value.workspaces : true,
  };
}

function parseTodayItems(value: unknown): TodayItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).flatMap((candidate) =>
    isRecord(candidate) &&
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0
      ? [
          {
            completed: candidate.completed === true,
            id: candidate.id,
            title: candidate.title.trim(),
          },
        ]
      : [],
  );
}

function parseIntegrationConnections(
  value: unknown,
): Partial<Record<IntegrationId, IntegrationConnection>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<IntegrationId, IntegrationConnection>> = {};
  for (const definition of NAVODE_INTEGRATIONS.all()) {
    const candidate = value[definition.id];
    if (!isRecord(candidate)) continue;
    const status = candidate.status;
    if (
      typeof candidate.enabled !== 'boolean' ||
      (status !== 'disconnected' && status !== 'connecting' && status !== 'connected' && status !== 'error')
    )
      continue;
    const grantedPermissionIds = Array.isArray(candidate.grantedPermissionIds)
      ? candidate.grantedPermissionIds
          .filter((id): id is string => typeof id === 'string')
          .filter((id) => definition.permissions.some((permission) => permission.id === id))
      : [];
    const lastRefreshAt = parseIsoDate(candidate.lastRefreshAt);
    const error = parseIntegrationError(candidate.error);
    result[definition.id] = {
      enabled: candidate.enabled,
      status,
      grantedPermissionIds,
      ...(lastRefreshAt ? { lastRefreshAt } : {}),
      ...(error ? { error } : {}),
    };
  }
  return result;
}

function parseIntegrationCache(
  value: unknown,
): Partial<Record<IntegrationId, IntegrationCacheState>> {
  if (!isRecord(value)) return {};
  const result: Partial<Record<IntegrationId, IntegrationCacheState>> = {};
  for (const definition of NAVODE_INTEGRATIONS.all()) {
    const candidate = value[definition.id];
    if (!isRecord(candidate) || !isRecord(candidate.entries)) continue;
    const entries: IntegrationCacheState['entries'] = {};
    for (const [key, entry] of Object.entries(candidate.entries).slice(0, 20)) {
      if (!isSafeRecordKey(key) || !isRecord(entry)) continue;
      const cachedAt = parseIsoDate(entry.cachedAt);
      if (!cachedAt || !isCacheValue(entry.value)) continue;
      entries[key.slice(0, 100)] = { cachedAt, value: entry.value };
    }
    result[definition.id] = { entries };
  }
  return result;
}

function parseIntegrationError(value: unknown): IntegrationConnection['error'] | undefined {
  if (!isRecord(value) || typeof value.code !== 'string' || typeof value.message !== 'string') {
    return undefined;
  }
  const occurredAt = parseIsoDate(value.occurredAt);
  const retryAt = parseIsoDate(value.retryAt);
  if (!occurredAt) return undefined;
  return {
    code: value.code.slice(0, 100),
    message: value.message.slice(0, 500),
    occurredAt,
    ...(retryAt ? { retryAt } : {}),
  };
}

function parseIsoDate(value: unknown): string | undefined {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
}

function isCacheValue(value: unknown, depth = 0): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value === 'number') return Number.isFinite(value);
  if (depth >= 4) return false;
  if (Array.isArray(value)) return value.length <= 100 && value.every((item) => isCacheValue(item, depth + 1));
  return isRecord(value) && Object.keys(value).length <= 100 && Object.values(value).every((item) => isCacheValue(item, depth + 1));
}

function isSafeRecordKey(value: string): boolean {
  return value !== '__proto__' && value !== 'constructor' && value !== 'prototype';
}

function numericValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function isProjectActionKind(value: unknown): value is ProjectActionKind {
  return (
    value === 'repository' ||
    value === 'frontend' ||
    value === 'backend' ||
    value === 'deployment' ||
    value === 'database' ||
    value === 'docs' ||
    value === 'custom'
  );
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

export {
  createProject,
  createProjectAction,
  createQuickLink,
  createStarterQuickLinks,
  createWorkspace,
  createWorkspaceItem,
  createWorkspaceLaunchPlan,
  removeProject,
  removeProjectAction,
  removeQuickLink,
  removeWorkspace,
  removeWorkspaceItem,
  reorderQuickLinks,
  saveProjectAction,
  saveWorkspaceItem,
  updateProject,
  updateQuickLink,
  updateWorkspace,
  type Project,
  type ProjectAction,
  type ProjectActionKind,
  type ProjectActionInput,
  type ProjectInput,
  type QuickLink,
  type QuickLinkInput,
  type Workspace,
  type WorkspaceInput,
  type WorkspaceItem,
  type WorkspaceItemInput,
  type WorkspaceLaunchPlan,
} from './organization';

export {
  DEFAULT_FOCUS_TIMER,
  DEFAULT_SCRATCHPAD,
  MAX_TODAY_ITEMS,
  addTodayItem,
  clearTodayItems,
  createSnippet,
  getFocusTimerSnapshot,
  pauseFocusTimer,
  removeSnippet,
  resetFocusTimer,
  resumeFocusTimer,
  saveSnippet,
  searchSnippets,
  startFocusTimer,
  toggleTodayItem,
  updateTodayItem,
  type FocusTimer,
  type FocusTimerSnapshot,
  type Scratchpad,
  type Snippet,
  type SnippetInput,
  type TodayItem,
} from './productivity';

export {
  NAVODE_BACKUP_SCHEMA_VERSION,
  createNavodeBackup,
  parseNavodeBackup,
  serializeNavodeBackup,
  type BackupImportResult,
  type NavodeBackup,
} from './backup';
