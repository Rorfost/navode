import {
  DEFAULT_NAVODE_SETTINGS,
  clearRecentExecutions,
  createCommandAlias,
  removeCommandAlias,
  startFocusTimer,
  type CommandAction,
  type CommandResult,
  type DefaultSearchProvider,
  type NavodeSettings,
  type Workspace,
} from '@navode/core';
import {
  getNextCalendarEvent,
  getNextCodeforcesContest,
  parseGitHubRepositoryReference,
  readCalendarCachedContext,
  readCodeforcesCachedContext,
  readGitHubCachedStatus,
  type IntegrationId,
} from '@navode/integrations';
import {
  lazy,
  Suspense,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Card,
  CommandResult as CommandResultOption,
  Dialog,
  KeyboardShortcutHint,
  Tab,
  Tabs,
  TextInput,
  Toggle,
  Tooltip,
} from './primitives';
import type { OrganizationScreen } from './organization-manager';
import type { ProductivityScreen } from './productivity-manager';
import { IntegrationSettings } from './integration-settings';

const OrganizationManager = lazy(() =>
  import('./organization-manager').then((module) => ({ default: module.OrganizationManager })),
);
const ProductivityManager = lazy(() =>
  import('./productivity-manager').then((module) => ({ default: module.ProductivityManager })),
);
const SettingsDataControls = lazy(() =>
  import('./settings-data-controls').then((module) => ({ default: module.SettingsDataControls })),
);

const searchProviders: Record<DefaultSearchProvider, { alias: string; label: string }> = {
  google: { alias: 'g', label: 'Google' },
  youtube: { alias: 'yt', label: 'YouTube' },
};

interface ShellCommandResult {
  action?: CommandAction;
  command: string;
  description: string;
  id: string;
  label: string;
  source?: string;
  resolved?: CommandResult;
  shortcut: string;
}

export interface NavodeShellProps {
  onCommand?: (command: string) => void;
  onCommandResult?: (result: CommandResult) => void;
  onWorkspaceLaunch?: (workspace: Workspace) => void;
  resolveCommandResults?: (input: string) => readonly CommandResult[];
  onSettingsChange?: (settings: NavodeSettings) => void;
  onIntegrationConnect?: (providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>) => void;
  settings?: NavodeSettings;
  startupNotice?: string;
}

export function NavodeShell({
  onCommand,
  onCommandResult,
  onWorkspaceLaunch,
  resolveCommandResults,
  onSettingsChange,
  onIntegrationConnect,
  settings = DEFAULT_NAVODE_SETTINGS,
  startupNotice,
}: NavodeShellProps) {
  const [command, setCommand] = useState('');
  const [selectedResult, setSelectedResult] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!settings.onboardingCompleted);
  const [now, setNow] = useState(() => new Date());
  const [aliasName, setAliasName] = useState('');
  const [aliasLabel, setAliasLabel] = useState('');
  const [aliasUrlTemplate, setAliasUrlTemplate] = useState('');
  const [aliasError, setAliasError] = useState('');
  const [editingAliasId, setEditingAliasId] = useState<string | null>(null);
  const [commandFeedback, setCommandFeedback] = useState('');
  const [organizationScreen, setOrganizationScreen] = useState<OrganizationScreen | null>(null);
  const [workspaceToLaunch, setWorkspaceToLaunch] = useState<Workspace | null>(null);
  const [productivityScreen, setProductivityScreen] = useState<ProductivityScreen | null>(null);
  const commandInput = useRef<HTMLInputElement>(null);
  const provider = searchProviders[settings.defaultSearchProvider];
  const results = useMemo(() => {
    const resolved = resolveCommandResults?.(command);
    return resolved
      ? resolved.map(toShellResult)
      : createCommandResults(command, settings.defaultSearchProvider);
  }, [command, resolveCommandResults, settings.defaultSearchProvider]);

  useEffect(() => {
    setIsOnboardingOpen(!settings.onboardingCompleted);
  }, [settings.onboardingCompleted]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') ||
          target.isContentEditable ||
          Boolean(target.closest('[contenteditable="true"]')));

      if (event.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isOnboardingOpen) setIsOnboardingOpen(false);
        return;
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
        event.preventDefault();
        commandInput.current?.focus();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isOnboardingOpen, isSettingsOpen]);

  function updateSettings(next: Partial<NavodeSettings>) {
    onSettingsChange?.({ ...settings, ...next });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = results[selectedResult];
    if (selected) executeResult(selected);
    else if (command.trim()) onCommand?.(command.trim());
  }

  function handleCommandKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedResult((current) => (current + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedResult((current) => (current - 1 + results.length) % results.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[selectedResult];
      if (selected) executeResult(selected);
    }
  }

  function chooseResult(index: number) {
    setSelectedResult(index);
    const result = results[index];
    if (result) executeResult(result);
  }

  function executeResult(result: ShellCommandResult) {
    const action = result.action;
    if (action) {
      if (action.type === 'error') {
        setCommandFeedback(action.message);
        return;
      }
      if (action.type === 'open-view' && action.view === 'settings') setIsSettingsOpen(true);
      if (
        action.type === 'open-view' &&
        (action.view === 'links' || action.view === 'projects' || action.view === 'workspaces')
      ) {
        setOrganizationScreen(action.view);
      }
      if (
        action.type === 'open-view' &&
        (action.view === 'snippets' || action.view === 'note' || action.view === 'today')
      ) {
        setProductivityScreen(action.view);
      }
      if (action.type === 'start-focus') {
        const timer = startFocusTimer(
          action.durationMinutes ?? settings.focusTimer.durationMinutes,
        );
        if (timer) updateSettings({ focusTimer: timer });
        setProductivityScreen('focus');
      }
      if (action.type === 'export-data') {
        setIsSettingsOpen(true);
        setCommandFeedback('Use Backup and recovery in Settings to export your data.');
      }
      if (action.type === 'run-snippet') {
        const snippet = settings.snippets.find((candidate) => candidate.id === action.snippetId);
        if (snippet && navigator.clipboard) {
          void navigator.clipboard
            .writeText(snippet.content)
            .then(() => setCommandFeedback(`Copied ${snippet.title}.`))
            .catch(() => setCommandFeedback('Clipboard access was unavailable.'));
        } else if (snippet) {
          setCommandFeedback('Clipboard access was unavailable.');
        }
      }
      if (action.type === 'launch-workspace') {
        const workspace = settings.workspaces.find(
          (candidate) => candidate.id === action.workspaceId,
        );
        if (workspace) setWorkspaceToLaunch(workspace);
        return;
      }
      if (result.resolved) onCommandResult?.(result.resolved);
      return;
    }
    onCommand?.(result.command);
  }

  function finishOnboarding() {
    updateSettings({ onboardingCompleted: true });
    setIsOnboardingOpen(false);
    commandInput.current?.focus();
  }

  function saveCustomAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editingAliasId ?? `alias-${Date.now()}`;
    const alias = createCommandAlias(
      { alias: aliasName, label: aliasLabel, urlTemplate: aliasUrlTemplate },
      id,
    );
    if (
      !alias ||
      settings.customAliases.some(
        (existing) => existing.id !== id && existing.alias === alias.alias,
      )
    ) {
      setAliasError('Use a unique alias with a safe http or https URL template.');
      return;
    }
    updateSettings({
      customAliases: editingAliasId
        ? settings.customAliases.map((existing) => (existing.id === id ? alias : existing))
        : [...settings.customAliases, alias],
    });
    resetAliasForm();
  }

  function editCustomAlias(id: string) {
    const alias = settings.customAliases.find((candidate) => candidate.id === id);
    if (!alias) return;
    setEditingAliasId(alias.id);
    setAliasName(alias.alias);
    setAliasLabel(alias.label);
    setAliasUrlTemplate(alias.urlTemplate);
    setAliasError('');
  }

  function resetAliasForm() {
    setAliasName('');
    setAliasLabel('');
    setAliasUrlTemplate('');
    setAliasError('');
    setEditingAliasId(null);
  }

  return (
    <main className="navode-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">YOUR CENTRAL NAVIGATION NODE</p>
          <h1>Navode</h1>
        </div>
        <div className="clock" aria-label="Current date and time">
          <time dateTime={now.toISOString()}>{formatDate(now)}</time>
          <span>{formatTime(now)}</span>
        </div>
        <Button
          aria-label="Open settings"
          onClick={(event) => {
            event.currentTarget.focus();
            setIsSettingsOpen(true);
          }}
          variant="quiet"
        >
          Settings
        </Button>
      </header>

      <section className="command-area" aria-labelledby="command-title">
        <h2 className="sr-only" id="command-title">
          Command bar
        </h2>
        <form aria-label="Run a Navode command" onSubmit={submit}>
          <label className="sr-only" htmlFor="command">
            What do you want to do?
          </label>
          <div className="command-row">
            <TextInput
              aria-autocomplete="list"
              aria-activedescendant={
                results[selectedResult] ? `command-result-${results[selectedResult].id}` : undefined
              }
              aria-controls="command-results"
              aria-expanded={results.length > 0}
              autoComplete="off"
              autoFocus
              id="command"
              name="command"
              onChange={(event) => {
                setCommand(event.target.value);
                setSelectedResult(0);
                setCommandFeedback('');
              }}
              onKeyDown={handleCommandKeys}
              placeholder={`Search ${provider.label} or run a command…`}
              ref={commandInput}
              role="combobox"
              value={command}
            />
            <Tooltip label="Run command">
              <Button aria-label="Run command" type="submit" variant="primary">
                Run
              </Button>
            </Tooltip>
          </div>
          <p className="command-help">
            Press <KeyboardShortcutHint>/</KeyboardShortcutHint> to focus, then use arrows to
            choose.
          </p>
        </form>
        {startupNotice && (
          <p className="startup-notice" role="alert">
            {startupNotice}
          </p>
        )}
        {results.length > 0 && (
          <div className="menu">
            <div id="command-results" role="listbox" aria-label="Command suggestions">
              {results.map((result, index) => (
                <CommandResultOption
                  active={selectedResult === index}
                  id={`command-result-${result.id}`}
                  key={result.id}
                  onClick={() => chooseResult(index)}
                >
                  <span className="result-label-group">
                    {result.source && <span className="result-badge">{result.source}</span>}
                    <span>
                      <strong>{result.label}</strong>
                      <small>{result.description}</small>
                    </span>
                  </span>
                  <KeyboardShortcutHint>{result.shortcut}</KeyboardShortcutHint>
                </CommandResultOption>
              ))}
            </div>
          </div>
        )}
        {commandFeedback && (
          <p className="command-feedback" role="status">
            {commandFeedback}
          </p>
        )}
      </section>

      <div className="content-grid">
        {settings.homeSections.quickAccess && (
          <Card aria-labelledby="quick-access-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">START HERE</p>
                <h2 id="quick-access-title">Quick access</h2>
              </div>
              <Button onClick={() => setOrganizationScreen('links')} variant="quiet">
                Manage
              </Button>
            </div>
            <div className="quick-actions">
              {settings.quickLinks
                .filter((link) => link.enabled && link.showOnHome)
                .slice(0, 6)
                .map((link) => (
                  <a
                    className="quick-link"
                    href={link.url}
                    key={link.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="link-initials" aria-hidden="true">
                      {link.icon ?? initials(link.name)}
                    </span>
                    {link.name}
                  </a>
                ))}
            </div>
            {!settings.quickLinks.some((link) => link.enabled && link.showOnHome) && (
              <div className="card-empty-state">
                <p className="empty-text">No quick links configured yet.</p>
                <Button onClick={() => setOrganizationScreen('links')} variant="quiet">
                  Add Quick Link
                </Button>
              </div>
            )}
          </Card>
        )}

        {settings.homeSections.projects && (
          <Card aria-labelledby="projects-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">YOUR WORK</p>
                <h2 id="projects-title">Projects &amp; workspaces</h2>
              </div>
              <Button onClick={() => setOrganizationScreen('projects')} variant="quiet">
                Manage
              </Button>
            </div>
            {settings.projects
              .filter((project) => project.showOnHome)
              .slice(0, 3)
              .map((project) => (
                <div className="preview-row" key={project.id}>
                  <span className="link-initials" aria-hidden="true">
                    {project.icon ?? initials(project.name)}
                  </span>
                  <span>
                    <strong>{project.name}</strong>
                    <small>{formatProjectStatus(project, settings.integrationCache.github)}</small>
                  </span>
                </div>
              ))}
            {!settings.projects.some((project) => project.showOnHome) && (
              <div className="card-empty-state">
                <p className="empty-text">No active projects yet.</p>
                <Button onClick={() => setOrganizationScreen('projects')} variant="quiet">
                  Create Project
                </Button>
              </div>
            )}
            <Button onClick={() => setOrganizationScreen('projects')}>Manage projects</Button>
          </Card>
        )}

        <Card aria-labelledby="calendar-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">DAILY CONTEXT</p>
              <h2 id="calendar-title">Calendar</h2>
            </div>
            <a className="quick-link" href="https://calendar.google.com" rel="noreferrer" target="_blank">
              Open
            </a>
          </div>
          <CalendarPreview cache={settings.integrationCache['google-calendar']} />
        </Card>

        {settings.competitiveProgramming.showWidget && (
          <Card aria-labelledby="contests-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">COMPETITIVE PROGRAMMING</p>
                <h2 id="contests-title">Contests</h2>
              </div>
              <Button
                onClick={() =>
                  onSettingsChange?.({
                    ...settings,
                    competitiveProgramming: { ...settings.competitiveProgramming, showWidget: false },
                  })
                }
                variant="quiet"
              >
                Hide
              </Button>
            </div>
            <CodeforcesPreview cache={settings.integrationCache['competitive-programming']} now={now} />
          </Card>
        )}

        {settings.homeSections.workspaces && (
          <Card aria-labelledby="workspaces-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">REPEATABLE ROUTINES</p>
                <h2 id="workspaces-title">Workspaces</h2>
              </div>
              <Button onClick={() => setOrganizationScreen('workspaces')} variant="quiet">
                Manage
              </Button>
            </div>
            {settings.workspaces
              .filter((workspace) => workspace.showOnHome)
              .slice(0, 3)
              .map((workspace) => (
                <div className="preview-row" key={workspace.id}>
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{workspace.items.length} destinations</small>
                  </span>
                  <Button
                    disabled={!workspace.items.length}
                    onClick={() => setWorkspaceToLaunch(workspace)}
                    variant="quiet"
                  >
                    Launch
                  </Button>
                </div>
              ))}
            {!settings.workspaces.some((workspace) => workspace.showOnHome) && (
              <div className="card-empty-state">
                <p className="empty-text">No active workspaces yet.</p>
                <Button onClick={() => setOrganizationScreen('workspaces')} variant="quiet">
                  Create Workspace
                </Button>
              </div>
            )}
            <Button onClick={() => setOrganizationScreen('workspaces')}>Manage workspaces</Button>
          </Card>
        )}

        {settings.homeSections.productivity && (
          <Card aria-labelledby="productivity-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">A LITTLE MOMENTUM</p>
                <h2 id="productivity-title">Productivity</h2>
              </div>
            </div>
            <p className="muted">
              {settings.todayItems.filter((item) => !item.completed).length} priorities left today ·{' '}
              {settings.snippets.length} snippets
            </p>
            <div className="productivity-actions">
              <Button onClick={() => setProductivityScreen('focus')}>Focus</Button>
              <Button onClick={() => setProductivityScreen('note')} variant="quiet">
                Note
              </Button>
              <Button onClick={() => setProductivityScreen('snippets')} variant="quiet">
                Snippets
              </Button>
              <Button onClick={() => setProductivityScreen('today')} variant="quiet">
                Today
              </Button>
            </div>
          </Card>
        )}
      </div>

      <Dialog
        label="Welcome to Navode"
        onClose={() => setIsOnboardingOpen(false)}
        open={isOnboardingOpen}
      >
        <p className="eyebrow">WELCOME</p>
        <h2>Your next tab, pointed somewhere useful.</h2>
        <p className="muted">
          Navode keeps your frequent moves close and lets you reach them from the keyboard.
        </p>
        <fieldset className="provider-options">
          <legend>Default search provider</legend>
          {(['google', 'youtube'] as const).map((searchProvider) => (
            <Toggle
              key={searchProvider}
              onClick={() => updateSettings({ defaultSearchProvider: searchProvider })}
              pressed={settings.defaultSearchProvider === searchProvider}
            >
              {searchProviders[searchProvider].label}
            </Toggle>
          ))}
        </fieldset>
        <p className="muted">
          We added Google, YouTube, and GitHub as safe quick links. You can change them later.
        </p>
        <div className="dialog-actions">
          <Button onClick={finishOnboarding} variant="quiet">
            Skip for now
          </Button>
          <Button onClick={finishOnboarding} variant="primary">
            Start using Navode
          </Button>
        </div>
      </Dialog>

      <Dialog
        label="Navode settings"
        onClose={() => setIsSettingsOpen(false)}
        open={isSettingsOpen}
      >
        <p className="eyebrow">PREFERENCES</p>
        <h2>Make Navode feel like yours.</h2>
        <Tabs label="Theme">
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <Tab
              active={settings.theme === theme}
              key={theme}
              onClick={() => updateSettings({ theme })}
            >
              {theme[0]?.toUpperCase()}
              {theme.slice(1)}
            </Tab>
          ))}
        </Tabs>
        <p className="muted">Theme preference is stored only on this device.</p>
        <section className="settings-section" aria-labelledby="aliases-title">
          <h3 id="aliases-title">Custom aliases</h3>
          <p className="muted">
            Use an alias followed by a query. Only public http and https URLs are accepted.
          </p>
          {settings.customAliases.length > 0 && (
            <ul className="alias-list" aria-label="Custom aliases">
              {settings.customAliases.map((alias) => (
                <li key={alias.id}>
                  <span>
                    <strong>{alias.alias}</strong> · {alias.label}
                  </span>
                  <span>
                    <Button onClick={() => editCustomAlias(alias.id)} variant="quiet">
                      Edit
                    </Button>
                    <Button
                      onClick={() =>
                        updateSettings({
                          customAliases: removeCommandAlias(settings.customAliases, alias.id),
                        })
                      }
                      variant="quiet"
                    >
                      Delete
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form className="alias-form" onSubmit={saveCustomAlias}>
            <label>
              Alias
              <TextInput
                maxLength={32}
                onChange={(event) => setAliasName(event.target.value)}
                placeholder="docs"
                required
                value={aliasName}
              />
            </label>
            <label>
              Label
              <TextInput
                onChange={(event) => setAliasLabel(event.target.value)}
                placeholder="Search documentation"
                required
                value={aliasLabel}
              />
            </label>
            <label>
              URL template
              <TextInput
                onChange={(event) => setAliasUrlTemplate(event.target.value)}
                placeholder="https://example.com/search?q={query}"
                required
                value={aliasUrlTemplate}
              />
            </label>
            {aliasError && (
              <p className="form-error" role="alert">
                {aliasError}
              </p>
            )}
            <div className="form-actions">
              {editingAliasId && (
                <Button onClick={resetAliasForm} variant="quiet">
                  Cancel
                </Button>
              )}
              <Button type="submit">{editingAliasId ? 'Save alias' : 'Add alias'}</Button>
            </div>
          </form>
        </section>
        <section className="settings-section" aria-labelledby="recent-actions-title">
          <div className="section-heading">
            <h3 id="recent-actions-title">Recent actions</h3>
            {settings.recentExecutions.length > 0 && (
              <Button
                onClick={() => updateSettings({ recentExecutions: clearRecentExecutions() })}
                variant="quiet"
              >
                Clear history
              </Button>
            )}
          </div>
          {settings.recentExecutions.length ? (
            <ul className="recent-actions">
              {settings.recentExecutions.slice(0, 5).map((execution) => (
                <li key={execution.id}>{execution.label}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              Executed commands appear here without storing their search terms.
            </p>
          )}
        </section>
        <IntegrationSettings
          onConnect={onIntegrationConnect}
          onSettingsChange={(next) => onSettingsChange?.(next)}
          settings={settings}
        />
        {isSettingsOpen && (
          <Suspense fallback={<p className="muted">Loading recovery controls…</p>}>
            <SettingsDataControls
              onOpenOnboarding={() => {
                setIsSettingsOpen(false);
                setIsOnboardingOpen(true);
              }}
              onOpenOrganization={(screen) => {
                setIsSettingsOpen(false);
                setOrganizationScreen(screen);
              }}
              onSettingsChange={(next) => onSettingsChange?.(next)}
              settings={settings}
            />
          </Suspense>
        )}
        <div className="dialog-actions">
          <Button onClick={() => setIsSettingsOpen(false)} variant="primary">
            Done
          </Button>
        </div>
      </Dialog>

      {organizationScreen && (
        <Suspense fallback={null}>
          <OrganizationManager
            onClose={() => setOrganizationScreen(null)}
            onRequestWorkspaceLaunch={setWorkspaceToLaunch}
            onSettingsChange={(next) => onSettingsChange?.(next)}
            screen={organizationScreen}
            settings={settings}
          />
        </Suspense>
      )}

      {productivityScreen && (
        <Suspense fallback={null}>
          <ProductivityManager
            onClose={() => setProductivityScreen(null)}
            onSettingsChange={(next) => onSettingsChange?.(next)}
            screen={productivityScreen}
            settings={settings}
          />
        </Suspense>
      )}

      <Dialog
        label="Launch workspace"
        onClose={() => setWorkspaceToLaunch(null)}
        open={workspaceToLaunch !== null}
      >
        <p className="eyebrow">CONFIRM LAUNCH</p>
        <h2>Open {workspaceToLaunch?.name}?</h2>
        <p className="muted">
          This will open {workspaceToLaunch?.items.length ?? 0}{' '}
          {workspaceToLaunch?.items.length === 1 ? 'tab' : 'tabs'} in your browser.
        </p>
        <div className="dialog-actions">
          <Button onClick={() => setWorkspaceToLaunch(null)} variant="quiet">
            Cancel
          </Button>
          <Button
            disabled={!workspaceToLaunch?.items.length}
            onClick={() => {
              if (workspaceToLaunch) onWorkspaceLaunch?.(workspaceToLaunch);
              setWorkspaceToLaunch(null);
            }}
            variant="primary"
          >
            Open workspace
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

function formatSourceTag(source?: string): string {
  switch (source) {
    case 'alias':
      return 'Alias';
    case 'direct-url':
      return 'URL';
    case 'fallback-search':
      return 'Search';
    case 'internal':
      return 'System';
    case 'quick-link':
      return 'Link';
    case 'project':
      return 'Project';
    case 'workspace':
      return 'Workspace';
    case 'snippet':
      return 'Snippet';
    default:
      return 'Command';
  }
}

function toShellResult(result: CommandResult): ShellCommandResult {
  return {
    action: result.action,
    command: result.command,
    description: result.description,
    id: result.id,
    label: result.label,
    source: formatSourceTag(result.source),
    resolved: result,
    shortcut: 'Enter',
  };
}

function createCommandResults(
  input: string,
  defaultProvider: DefaultSearchProvider,
): ShellCommandResult[] {
  const query = input.trim();
  if (!query || /^(g|google|yt|youtube|focus)\b/i.test(query)) return [];

  const primary = searchProviders[defaultProvider];
  const secondaryProvider: DefaultSearchProvider =
    defaultProvider === 'google' ? 'youtube' : 'google';
  const secondary = searchProviders[secondaryProvider];
  return [
    {
      id: primary.alias,
      label: `Search ${primary.label} for “${query}”`,
      description: `Run ${primary.alias} ${query}`,
      command: `${primary.alias} ${query}`,
      source: 'Search',
      shortcut: 'Enter',
    },
    {
      id: secondary.alias,
      label: `Search ${secondary.label} for “${query}”`,
      description: `Run ${secondary.alias} ${query}`,
      command: `${secondary.alias} ${query}`,
      source: 'Search',
      shortcut: '↓',
    },
  ];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatProjectStatus(
  project: NavodeSettings['projects'][number],
  cache: NavodeSettings['integrationCache']['github'],
): string {
  if (!project.githubRepository) return `${project.actions.length} actions`;
  const reference = parseGitHubRepositoryReference(project.githubRepository);
  const status = reference ? readGitHubCachedStatus(cache, reference) : undefined;
  if (!status) return `${project.githubRepository} · Cached status unavailable`;
  const workflow = status.workflow
    ? ` · ${status.workflow.name}: ${status.workflow.conclusion ?? status.workflow.status}`
    : '';
  return `${status.openPullRequestCount} PRs · ${status.issueCount} issues${workflow}`;
}

function CalendarPreview({ cache }: { cache: NavodeSettings['integrationCache']['google-calendar'] }) {
  const context = readCalendarCachedContext(cache);
  if (!context) return <p className="empty-text">Connect Google Calendar to see today’s events.</p>;
  const next = getNextCalendarEvent(context);
  return (
    <div className="calendar-preview">
      <p className="muted">
        {next
          ? `Next: ${next.title} · ${formatCalendarTime(next.startAt)} · ${formatTimeUntil(next.startAt)}`
          : 'No more timed events today.'}
      </p>
      {context.events.slice(0, 3).map((event) => (
        <div className="preview-row" key={event.id}>
          <span>
            <strong>{event.title}</strong>
            <small>{event.allDay ? 'All day' : formatCalendarTime(event.startAt)}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function CodeforcesPreview({
  cache,
  now,
}: {
  cache: NavodeSettings['integrationCache']['competitive-programming'];
  now: Date;
}) {
  const context = readCodeforcesCachedContext(cache);
  if (!context) return <p className="empty-text">Connect Competitive programming to see Codeforces contests.</p>;
  const next = getNextCodeforcesContest(context, now);
  return (
    <div className="calendar-preview">
      <p className="muted">
        {next ? `Next: ${next.name} · ${formatCalendarTime(next.startAt)} · ${formatTimeUntil(next.startAt)}` : 'No upcoming Codeforces contests.'}
      </p>
      {context.profile && (
        <p className="muted">
          {context.profile.handle} · {context.profile.title ?? 'Unrated'}{context.profile.rating ? ` · ${context.profile.rating}` : ''}
        </p>
      )}
      {context.submissions.slice(0, 2).map((submission) => (
        <div className="preview-row" key={submission.id}>
          <span>
            <strong>{submission.problemName}</strong>
            <small>{submission.verdict}</small>
          </span>
        </div>
      ))}
      <a className="quick-link" href="https://codeforces.com/problemset" rel="noreferrer" target="_blank">Practice Codeforces</a>
    </div>
  );
}

function formatCalendarTime(value: string | undefined): string {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
    : 'All day';
}

function formatTimeUntil(value: string | undefined): string {
  const target = value ? Date.parse(value) : Number.NaN;
  if (!Number.isFinite(target)) return 'Time unavailable';
  const minutes = Math.max(0, Math.round((target - Date.now()) / 60_000));
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `in ${hours}h ${minutes % 60}m`;
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'N'
  );
}
