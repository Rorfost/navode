export type SearchProviderId = 'google' | 'youtube' | 'github' | 'codeforces' | 'leetcode';
export type InternalCommandView =
  | 'settings'
  | 'links'
  | 'projects'
  | 'workspaces'
  | 'snippets'
  | 'note'
  | 'today';
export type CommandSource =
  | 'alias'
  | 'direct-url'
  | 'fallback-search'
  | 'internal'
  | 'quick-link'
  | 'project'
  | 'workspace'
  | 'snippet';

export interface SearchProvider {
  id: SearchProviderId;
  label: string;
  aliases: readonly string[];
  searchUrl: (query: string) => string;
}

export interface CommandAlias {
  id: string;
  alias: string;
  label: string;
  urlTemplate: string;
}

export interface QuickLinkCommandTarget {
  id: string;
  label: string;
  url: string;
  aliases?: readonly string[];
}

export interface ProjectCommandTarget {
  githubRepository?: string;
  id: string;
  label: string;
  aliases?: readonly string[];
}

export interface WorkspaceCommandTarget {
  id: string;
  label: string;
  aliases?: readonly string[];
}

export interface SnippetCommandTarget {
  id: string;
  label: string;
  aliases?: readonly string[];
}

export interface CommandCatalog {
  customAliases?: readonly CommandAlias[];
  defaultSearchProvider?: SearchProviderId;
  projects?: readonly ProjectCommandTarget[];
  quickLinks?: readonly QuickLinkCommandTarget[];
  snippets?: readonly SnippetCommandTarget[];
  workspaces?: readonly WorkspaceCommandTarget[];
}

export type CommandAction =
  | { type: 'open-url'; url: string }
  | { type: 'open-view'; view: InternalCommandView }
  | { type: 'run-snippet'; snippetId: string }
  | { type: 'launch-workspace'; workspaceId: string }
  | { type: 'start-focus'; durationMinutes?: number }
  | { type: 'export-data' }
  | { type: 'show-help' }
  | { type: 'error'; message: string };

export interface CommandResult {
  action: CommandAction;
  command: string;
  description: string;
  id: string;
  label: string;
  score: number;
  source: CommandSource;
}

export interface RecentExecution {
  actionType: Exclude<CommandAction['type'], 'error'>;
  id: string;
  label: string;
  performedAt: string;
}

export interface NewCommandAlias {
  alias: string;
  label: string;
  urlTemplate: string;
}

export const MAX_RECENT_EXECUTIONS = 20;

export const BUILT_IN_SEARCH_PROVIDERS: readonly SearchProvider[] = [
  {
    id: 'google',
    label: 'Google',
    aliases: ['g', 'google'],
    searchUrl: (query) => `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    aliases: ['yt', 'youtube'],
    searchUrl: (query) =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
  },
  {
    id: 'github',
    label: 'GitHub',
    aliases: ['gh', 'github'],
    searchUrl: (query) => `https://github.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    id: 'codeforces',
    label: 'Codeforces',
    aliases: ['cf', 'codeforces'],
    searchUrl: (query) => `https://codeforces.com/problemset?search=${encodeURIComponent(query)}`,
  },
  {
    id: 'leetcode',
    label: 'LeetCode',
    aliases: ['lc', 'leetcode'],
    searchUrl: (query) => `https://leetcode.com/problemset/?search=${encodeURIComponent(query)}`,
  },
];

const internalCommands: Readonly<Record<string, { label: string; action: CommandAction }>> = {
  settings: { label: 'Open settings', action: { type: 'open-view', view: 'settings' } },
  links: { label: 'Open quick links', action: { type: 'open-view', view: 'links' } },
  projects: { label: 'Open projects', action: { type: 'open-view', view: 'projects' } },
  workspaces: { label: 'Open workspaces', action: { type: 'open-view', view: 'workspaces' } },
  snippets: { label: 'Open snippets', action: { type: 'open-view', view: 'snippets' } },
  note: { label: 'Open scratchpad', action: { type: 'open-view', view: 'note' } },
  today: { label: 'Open today priorities', action: { type: 'open-view', view: 'today' } },
  focus: { label: 'Start focus time', action: { type: 'start-focus' } },
  export: { label: 'Export Navode data', action: { type: 'export-data' } },
  help: { label: 'Show command help', action: { type: 'show-help' } },
};

export function parseCommandInput(input: string): { argument: string; name: string } | null {
  const normalized = input.trim();
  if (!normalized) return null;
  const [name = '', ...rest] = normalized.split(/\s+/);
  return { name: name.toLowerCase(), argument: rest.join(' ') };
}

export function resolveCommand(input: string, catalog: CommandCatalog = {}): CommandResult {
  const normalized = input.trim();
  if (!normalized) return createHelpResult('');

  const directUrl = resolveDirectUrl(normalized);
  if (directUrl) return directUrl;

  const parsed = parseCommandInput(normalized);
  if (!parsed) return createHelpResult(normalized);

  if (parsed.name === 'calendar' && !parsed.argument) {
    return createResult({
      action: { type: 'open-url', url: 'https://calendar.google.com' },
      command: normalized,
      description: 'Open Google Calendar',
      id: 'calendar:open',
      label: 'Open Google Calendar',
      score: 100,
      source: 'internal',
    });
  }
  if (parsed.name === 'next' && parsed.argument === 'event') {
    return createResult({
      action: { type: 'open-url', url: 'https://calendar.google.com' },
      command: normalized,
      description: 'Open Google Calendar for your next event',
      id: 'calendar:next-event',
      label: 'Open next calendar event',
      score: 100,
      source: 'internal',
    });
  }

  const githubResult = resolveGitHubCommand(parsed.argument, parsed.name, normalized, catalog);
  if (githubResult) return githubResult;

  const aliasResult = resolveAlias(parsed.name, parsed.argument, normalized, catalog);
  if (aliasResult) return aliasResult;

  if (parsed.name === 'focus' && parsed.argument) {
    const durationMinutes = Number(parsed.argument);
    if (Number.isInteger(durationMinutes) && durationMinutes >= 1 && durationMinutes <= 180) {
      return createResult({
        action: { type: 'start-focus', durationMinutes },
        command: normalized,
        description: `Start a ${durationMinutes}-minute focus session`,
        id: `internal:focus:${durationMinutes}`,
        label: `Start ${durationMinutes}-minute focus`,
        score: 100,
        source: 'internal',
      });
    }
    return createResult({
      action: { type: 'error', message: 'Use focus followed by a whole number from 1 to 180.' },
      command: normalized,
      description: 'Focus duration must be between 1 and 180 minutes.',
      id: 'error:focus-duration',
      label: 'Invalid focus duration',
      score: 100,
      source: 'internal',
    });
  }

  const internal = internalCommands[parsed.name];
  if (internal && !parsed.argument) {
    return createResult({
      action: internal.action,
      command: normalized,
      description: internal.label,
      id: `internal:${parsed.name}`,
      label: internal.label,
      score: 100,
      source: 'internal',
    });
  }

  const matches = getPredictableMatches(normalized, catalog);
  const bestMatch = matches[0];
  if (bestMatch && bestMatch.score >= 80) return bestMatch;

  return createFallbackSearchResult(normalized, catalog.defaultSearchProvider ?? 'google');
}

export function getCommandResults(input: string, catalog: CommandCatalog = {}): CommandResult[] {
  if (!input.trim()) return [];
  const primary = resolveCommand(input, catalog);
  const normalized = input.trim();
  if (primary.action.type === 'error') return [primary];

  const matches = getPredictableMatches(normalized, catalog);
  const candidates = [primary, ...matches];
  const seen = new Set<string>();
  return candidates
    .filter((result) => {
      if (seen.has(result.id)) return false;
      seen.add(result.id);
      return true;
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
}

export function createCommandAlias(input: NewCommandAlias, id: string): CommandAlias | null {
  const alias = input.alias.trim().toLowerCase();
  const label = input.label.trim();
  const urlTemplate = input.urlTemplate.trim();
  if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(alias) || !label || !isSafeUrlTemplate(urlTemplate))
    return null;
  if (isReservedAlias(alias)) return null;
  return { id, alias, label, urlTemplate };
}

export function removeCommandAlias(aliases: readonly CommandAlias[], id: string): CommandAlias[] {
  return aliases.filter((alias) => alias.id !== id);
}

export function recordRecentExecution(
  history: readonly RecentExecution[],
  result: CommandResult,
  performedAt = new Date().toISOString(),
): RecentExecution[] {
  if (result.action.type === 'error') return [...history];
  const execution: RecentExecution = {
    actionType: result.action.type,
    id: `${performedAt}:${history.length}`,
    label: result.label,
    performedAt,
  };
  return [execution, ...history].slice(0, MAX_RECENT_EXECUTIONS);
}

export function clearRecentExecutions(): RecentExecution[] {
  return [];
}

export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function resolveDirectUrl(input: string): CommandResult | null {
  if (hasExplicitScheme(input)) {
    if (!isSafeExternalUrl(input)) return createUnsafeUrlResult(input);
    return createResult({
      action: { type: 'open-url', url: input },
      command: input,
      description: 'Open this URL in a new tab',
      id: `url:${input}`,
      label: 'Open URL',
      score: 100,
      source: 'direct-url',
    });
  }
  if (!looksLikeDomain(input)) return null;

  const url = `https://${input}`;
  return createResult({
    action: { type: 'open-url', url },
    command: input,
    description: 'Open this URL in a new tab',
    id: `url:${url}`,
    label: 'Open URL',
    score: 100,
    source: 'direct-url',
  });
}

function resolveAlias(
  name: string,
  argument: string,
  command: string,
  catalog: CommandCatalog,
): CommandResult | null {
  const provider = BUILT_IN_SEARCH_PROVIDERS.find((candidate) => candidate.aliases.includes(name));
  if (provider) {
    return createResult({
      action: { type: 'open-url', url: provider.searchUrl(argument) },
      command,
      description: argument
        ? `Search ${provider.label} for “${argument}”`
        : `Open ${provider.label}`,
      id: `search:${provider.id}:${argument.toLowerCase()}`,
      label: argument ? `Search ${provider.label}` : `Open ${provider.label}`,
      score: 100,
      source: 'alias',
    });
  }

  const alias = catalog.customAliases?.find((candidate) => candidate.alias === name);
  if (!alias) return null;
  const url = alias.urlTemplate.replaceAll('{query}', encodeURIComponent(argument));
  if (!isSafeExternalUrl(url)) return createUnsafeUrlResult(command);
  return createResult({
    action: { type: 'open-url', url },
    command,
    description: argument ? `${alias.label}: ${argument}` : alias.label,
    id: `custom:${alias.id}:${argument.toLowerCase()}`,
    label: alias.label,
    score: 100,
    source: 'alias',
  });
}

function resolveGitHubCommand(
  argument: string,
  name: string,
  command: string,
  catalog: CommandCatalog,
): CommandResult | null {
  if (name !== 'gh') return null;
  const [section, ...repositoryParts] = argument.split(/\s+/).filter(Boolean);
  const isSection = section === 'prs' || section === 'issues' || section === 'actions';
  const repositoryInput = (isSection ? repositoryParts : [section, ...repositoryParts])
    .join(' ')
    .trim()
    .toLowerCase();
  if (!repositoryInput) return null;
  const project = catalog.projects?.find(
    (candidate) =>
      candidate.githubRepository?.toLowerCase() === repositoryInput ||
      candidate.label.toLowerCase() === repositoryInput,
  );
  if (!project?.githubRepository) return null;
  const suffix = section === 'prs' ? '/pulls' : isSection ? `/${section}` : '';
  const viewLabel =
    section === 'prs' ? 'pull requests' : section === 'issues' ? 'issues' : section === 'actions' ? 'workflow runs' : 'repository';
  const url = `https://github.com/${project.githubRepository}${suffix}`;
  return createResult({
    action: { type: 'open-url', url },
    command,
    description: `Open ${viewLabel} for ${project.githubRepository}`,
    id: `github:${project.id}:${section ?? 'repository'}`,
    label: `Open ${project.githubRepository}${suffix}`,
    score: 100,
    source: 'project',
  });
}

function getPredictableMatches(input: string, catalog: CommandCatalog): CommandResult[] {
  const normalized = normalizeMatch(input);
  const matches: CommandResult[] = [];

  for (const [name, command] of Object.entries(internalCommands)) {
    const score = scoreMatch(normalized, [name, command.label]);
    if (score) {
      matches.push(
        createResult({
          action: command.action,
          command: input,
          description: command.label,
          id: `internal:${name}`,
          label: command.label,
          score,
          source: 'internal',
        }),
      );
    }
  }

  for (const quickLink of catalog.quickLinks ?? []) {
    const score = scoreMatch(normalized, [quickLink.label, ...(quickLink.aliases ?? [])]);
    if (score && isSafeExternalUrl(quickLink.url)) {
      matches.push(
        createResult({
          action: { type: 'open-url', url: quickLink.url },
          command: input,
          description: `Open ${quickLink.label}`,
          id: `quick-link:${quickLink.id}`,
          label: quickLink.label,
          score,
          source: 'quick-link',
        }),
      );
    }
  }

  for (const project of catalog.projects ?? []) {
    addViewMatch(matches, normalized, input, project, 'project', 'projects');
  }
  for (const workspace of catalog.workspaces ?? []) {
    const score = scoreMatch(normalized, [workspace.label, ...(workspace.aliases ?? [])]);
    if (score) {
      matches.push(
        createResult({
          action: { type: 'launch-workspace', workspaceId: workspace.id },
          command: input,
          description: `Launch ${workspace.label}`,
          id: `workspace:${workspace.id}`,
          label: workspace.label,
          score,
          source: 'workspace',
        }),
      );
    }
  }
  for (const snippet of catalog.snippets ?? []) {
    const score = scoreMatch(normalized, [snippet.label, ...(snippet.aliases ?? [])]);
    if (score) {
      matches.push(
        createResult({
          action: { type: 'run-snippet', snippetId: snippet.id },
          command: input,
          description: `Use snippet ${snippet.label}`,
          id: `snippet:${snippet.id}`,
          label: snippet.label,
          score,
          source: 'snippet',
        }),
      );
    }
  }

  return matches;
}

function addViewMatch(
  results: CommandResult[],
  input: string,
  command: string,
  target: ProjectCommandTarget | WorkspaceCommandTarget,
  source: 'project' | 'workspace',
  view: 'projects' | 'workspaces',
) {
  const score = scoreMatch(input, [target.label, ...(target.aliases ?? [])]);
  if (score) {
    results.push(
      createResult({
        action: { type: 'open-view', view },
        command,
        description: `Open ${target.label}`,
        id: `${source}:${target.id}`,
        label: target.label,
        score,
        source,
      }),
    );
  }
}

function createFallbackSearchResult(query: string, providerId: SearchProviderId): CommandResult {
  const provider =
    BUILT_IN_SEARCH_PROVIDERS.find((candidate) => candidate.id === providerId) ??
    BUILT_IN_SEARCH_PROVIDERS[0]!;
  return createResult({
    action: { type: 'open-url', url: provider.searchUrl(query) },
    command: query,
    description: `Search ${provider.label} for “${query}”`,
    id: `fallback:${provider.id}:${query.toLowerCase()}`,
    label: `Search ${provider.label}`,
    score: 20,
    source: 'fallback-search',
  });
}

function createHelpResult(command: string): CommandResult {
  return createResult({
    action: { type: 'show-help' },
    command,
    description: 'See available searches and built-in commands',
    id: 'internal:help',
    label: 'Show command help',
    score: 100,
    source: 'internal',
  });
}

function createUnsafeUrlResult(command: string): CommandResult {
  return createResult({
    action: { type: 'error', message: 'Only http and https URLs can be opened.' },
    command,
    description: 'Navode blocked an unsafe URL.',
    id: 'error:unsafe-url',
    label: 'Unsafe URL blocked',
    score: 100,
    source: 'direct-url',
  });
}

function createResult(result: CommandResult): CommandResult {
  return result;
}

function isSafeUrlTemplate(template: string): boolean {
  return isSafeExternalUrl(template.replaceAll('{query}', 'query'));
}

function isReservedAlias(alias: string): boolean {
  return (
    BUILT_IN_SEARCH_PROVIDERS.some((provider) => provider.aliases.includes(alias)) ||
    Object.hasOwn(internalCommands, alias)
  );
}

function hasExplicitScheme(input: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(input);
}

function looksLikeDomain(input: string): boolean {
  return /^(?:www\.)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?:[/?#][^\s]*)?$/i.test(
    input,
  );
}

function normalizeMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreMatch(input: string, candidates: readonly string[]): number {
  for (const candidate of candidates) {
    const normalized = normalizeMatch(candidate);
    if (input === normalized) return 100;
    if (normalized.startsWith(input)) return 85;
    if (normalized.includes(input)) return 60;
  }
  return 0;
}
