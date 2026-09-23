import {
  DEFAULT_NAVODE_SETTINGS,
  appendWorkflowExecutionLog,
  clearRecentExecutions,
  clearWorkflowHistoryLog,
  createCommandAlias,
  generateContextSuggestions,
  removeCommandAlias,
  requiresUserApproval,
  runWorkflowExecution,
  startFocusTimer,
  enablePlugin,
  disablePlugin,
  uninstallPlugin,
  type CommandAction,
  type CommandResult,
  type ContextInputData,
  type ContextSuggestion,
  type DefaultSearchProvider,
  type NavodeSettings,
  type SyncStatus,
  type Workflow,
  type Workspace,
} from '@navode/core';
import {
  getNextCalendarEvent,
  getNextCodeforcesContest,
  isCacheStale,
  isCodeforcesCacheStale,
  NAVODE_INTEGRATIONS,
  parseGitHubRepositoryReference,
  readCalendarCachedContext,
  readCodeforcesCachedContext,
  readGitHubCachedStatus,
  readProjectHealthCheck,
  type IntegrationConnection,
  type IntegrationId,
  type ProjectHealthTarget,
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
import { ContextSuggestionsBanner } from './context-suggestions-banner';
import { WorkflowManager } from './workflow-manager';
import { WorkflowPreviewDialog } from './workflow-preview-dialog';
import { PluginManagerPanel } from './plugin-manager-panel';

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
  brandIconSrc?: string;
  onCommand?: (command: string) => void;
  onCommandResult?: (result: CommandResult) => void;
  onWorkspaceLaunch?: (workspace: Workspace) => void;
  resolveCommandResults?: (input: string) => readonly CommandResult[];
  onSettingsChange?: (settings: NavodeSettings) => void;
  onIntegrationConnect?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onIntegrationDisconnect?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onIntegrationRefresh?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onProjectHealthRefresh?: () => void;
  onProjectHealthTargetSave?: (target: ProjectHealthTarget) => Promise<boolean>;
  settings?: NavodeSettings;
  startupNotice?: string;
  syncStatus?: SyncStatus;
}

export function NavodeShell({
  brandIconSrc = '/branding/icon-128.png',
  onCommand,
  onCommandResult,
  onWorkspaceLaunch,
  resolveCommandResults,
  onSettingsChange,
  onIntegrationConnect,
  onIntegrationDisconnect,
  onIntegrationRefresh,
  onProjectHealthRefresh,
  onProjectHealthTargetSave,
  settings = DEFAULT_NAVODE_SETTINGS,
  startupNotice,
  syncStatus = 'local-only',
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
  const [healthProjectId, setHealthProjectId] = useState<string | undefined>();
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isWorkflowManagerOpen, setIsWorkflowManagerOpen] = useState(false);
  const [isPluginManagerOpen, setIsPluginManagerOpen] = useState(false);
  const [pendingWorkflowExecution, setPendingWorkflowExecution] = useState<{
    workflow: Workflow;
    reason?: string;
  } | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<string[]>([]);

  const contextSuggestions = useMemo(() => {
    if (!settings.enableContextSuggestions) return [];
    const input: ContextInputData = {
      activeFocusTimer: settings.focusTimer,
      ...(settings.projects.length > 0 && settings.projects[0]
        ? { currentProject: settings.projects[0] }
        : {}),
    };
    const raw = generateContextSuggestions(input, now);
    return raw.filter((s) => !dismissedSuggestions.includes(s.id));
  }, [
    settings.enableContextSuggestions,
    settings.focusTimer,
    settings.projects,
    now,
    dismissedSuggestions,
  ]);

  const executeWorkflowWithApproval = async (workflow: Workflow, userApproved = false) => {
    const approvalCheck = requiresUserApproval(workflow, { userApproved });
    if (approvalCheck.requiresApproval && !userApproved) {
      setPendingWorkflowExecution({
        workflow,
        ...(approvalCheck.reason ? { reason: approvalCheck.reason } : {}),
      });
      return;
    }

    setPendingWorkflowExecution(null);
    const result = await runWorkflowExecution(workflow, 'manual', {
      userApproved: true,
      openUrl: (url) => {
        window.open(url, '_blank');
      },
      startFocusTimer: (minutes) => {
        const timer = startFocusTimer(minutes);
        if (timer) updateSettings({ focusTimer: timer });
      },
      notify: (title, message) => {
        setCommandFeedback(`${title}: ${message}`);
      },
      refreshIntegration: (providerId) => {
        if (
          providerId === 'github' ||
          providerId === 'google-calendar' ||
          providerId === 'competitive-programming'
        ) {
          onIntegrationRefresh?.(providerId);
        }
      },
    });

    const updatedLog = appendWorkflowExecutionLog(settings.workflowHistory, result);
    updateSettings({ workflowHistory: updatedLog });
    setCommandFeedback(`Executed workflow "${workflow.name}" (${result.status})`);
  };
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
      if (action.type === 'open-view' && action.view === 'health') {
        setHealthProjectId(action.projectId);
        setIsHealthOpen(true);
      }
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

  const activeTheme = useMemo(() => {
    if (!settings.activeThemePlugin) return null;
    const plugin = settings.installedPlugins.find((p) => p.id === settings.activeThemePlugin);
    if (!plugin || !plugin.enabled) return null;
    return plugin.manifest.themes?.[0] || null;
  }, [settings.activeThemePlugin, settings.installedPlugins]);

  return (
    <main className="navode-shell">
      {activeTheme && (
        <style>
          {`
            :root {
              ${Object.entries(activeTheme.tokens)
                .map(([key, value]) => `${key}: ${value};`)
                .join('\n              ')}
            }
          `}
        </style>
      )}
      <header className="shell-header">
        <div className="shell-brand">
          <p className="eyebrow">YOUR CENTRAL NAVIGATION NODE</p>
          <div className="shell-brand-lockup">
            <img alt="" className="shell-brand-icon" src={brandIconSrc} />
            <h1>Navode</h1>
          </div>
        </div>
        <div className="clock" aria-label="Current date and time">
          <time dateTime={now.toISOString()}>{formatDate(now)}</time>
          <span>{formatTime(now)}</span>
        </div>
        <p aria-live="polite" className="muted sync-status">
          {syncStatus === 'local-only'
            ? 'Local only'
            : syncStatus === 'synced'
              ? 'Signed in / synced'
              : syncStatus === 'syncing'
                ? 'Syncing'
                : syncStatus === 'paused'
                  ? 'Sync paused'
                  : 'Sync error'}
        </p>
        <Button
          aria-label="Open workflows"
          onClick={() => setIsWorkflowManagerOpen(true)}
          variant="quiet"
        >
          Workflows
        </Button>
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

      <ContextSuggestionsBanner
        suggestions={contextSuggestions}
        onAction={(sugg) => {
          if (sugg.actionKind === 'run-workflow') {
            const wf = settings.workflows.find((w) => w.id === sugg.actionTarget);
            if (wf) executeWorkflowWithApproval(wf);
          } else if (sugg.actionKind === 'open-url') {
            window.open(sugg.actionTarget, '_blank');
          } else if (sugg.actionKind === 'focus-timer') {
            const timer = startFocusTimer(25);
            if (timer) updateSettings({ focusTimer: timer });
          }
        }}
        onDismiss={(id) => setDismissedSuggestions((prev) => [...prev, id])}
      />

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

        {settings.integrationWidgets.calendar && (
          <Card aria-labelledby="calendar-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">DAILY CONTEXT</p>
                <h2 id="calendar-title">Calendar</h2>
              </div>
              <a
                className="quick-link"
                href="https://calendar.google.com"
                rel="noreferrer"
                target="_blank"
              >
                Open
              </a>
            </div>
            <CalendarPreview
              cache={settings.integrationCache['google-calendar']}
              {...(settings.integrations['google-calendar']
                ? { connection: settings.integrations['google-calendar'] }
                : {})}
            />
          </Card>
        )}

        {settings.integrationWidgets.github && (
          <Card aria-labelledby="github-widget-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">REPOSITORY CONTEXT</p>
                <h2 id="github-widget-title">GitHub</h2>
              </div>
              <Button onClick={() => onIntegrationRefresh?.('github')} variant="quiet">
                Refresh
              </Button>
            </div>
            <GitHubPreview
              cache={settings.integrationCache.github}
              {...(settings.integrations.github
                ? { connection: settings.integrations.github }
                : {})}
              projects={settings.projects}
            />
          </Card>
        )}

        {settings.integrationWidgets.competitiveProgramming && (
          <Card aria-labelledby="contests-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">COMPETITIVE PROGRAMMING</p>
                <h2 id="contests-title">Contests</h2>
              </div>
              <Button
                onClick={() => onIntegrationRefresh?.('competitive-programming')}
                variant="quiet"
              >
                Refresh
              </Button>
            </div>
            <CodeforcesPreview
              cache={settings.integrationCache['competitive-programming']}
              {...(settings.integrations['competitive-programming']
                ? { connection: settings.integrations['competitive-programming'] }
                : {})}
              now={now}
            />
          </Card>
        )}

        {settings.integrationWidgets.projectHealth && (
          <Card aria-labelledby="project-health-preview-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">LIVE SERVICES</p>
                <h2 id="project-health-preview-title">Project health</h2>
              </div>
              <Button
                onClick={() => {
                  setHealthProjectId(undefined);
                  setIsHealthOpen(true);
                }}
                variant="quiet"
              >
                View all
              </Button>
            </div>
            <ProjectHealthPreview
              cache={settings.integrationCache['project-health']}
              projects={settings.projects}
              targets={settings.projectHealthTargets}
            />
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
          {...(onIntegrationConnect ? { onConnect: onIntegrationConnect } : {})}
          {...(onIntegrationDisconnect ? { onDisconnect: onIntegrationDisconnect } : {})}
          {...(onIntegrationRefresh
            ? {
                onRefresh: onIntegrationRefresh,
                onRefreshAll: () => {
                  onIntegrationRefresh('github');
                  onIntegrationRefresh('google-calendar');
                  onIntegrationRefresh('competitive-programming');
                  onProjectHealthRefresh?.();
                },
              }
            : {})}
          {...(onProjectHealthTargetSave ? { onProjectHealthTargetSave } : {})}
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
              onOpenPluginManager={() => {
                setIsSettingsOpen(false);
                setIsPluginManagerOpen(true);
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

      <Dialog label="Project health" onClose={() => setIsHealthOpen(false)} open={isHealthOpen}>
        <p className="eyebrow">SERVICE STATUS</p>
        <h2>Project health</h2>
        <ProjectHealthPreview
          cache={settings.integrationCache['project-health']}
          {...(healthProjectId ? { projectId: healthProjectId } : {})}
          projects={settings.projects}
          targets={settings.projectHealthTargets}
        />
        <div className="dialog-actions">
          <Button disabled={!settings.projectHealthTargets.length} onClick={onProjectHealthRefresh}>
            Refresh checks
          </Button>
          <Button onClick={() => setIsHealthOpen(false)} variant="primary">
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

      <Dialog
        label="Plugin Manager"
        onClose={() => setIsPluginManagerOpen(false)}
        open={isPluginManagerOpen}
      >
        <PluginManagerPanel
          settings={settings}
          onEnablePlugin={(entry) => {
            const result = enablePlugin(settings, entry);
            if (result.success && result.settings) {
              updateSettings(result.settings);
            } else {
              alert(result.error);
            }
          }}
          onDisablePlugin={(id) => {
            updateSettings(disablePlugin(settings, id));
          }}
          onUninstallPlugin={(id) => {
            updateSettings(uninstallPlugin(settings, id));
          }}
        />
        <div className="dialog-actions">
          <Button onClick={() => setIsPluginManagerOpen(false)} variant="primary">
            Done
          </Button>
        </div>
      </Dialog>

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

      <Dialog
        label="Workflow Manager"
        onClose={() => setIsWorkflowManagerOpen(false)}
        open={isWorkflowManagerOpen}
      >
        <p className="eyebrow">AUTOMATE</p>
        <h2>Workflows & Automation</h2>
        <WorkflowManager
          workflows={settings.workflows}
          historyLog={settings.workflowHistory}
          onSaveWorkflow={(wf) => {
            const exists = settings.workflows.some((w) => w.id === wf.id);
            const nextWorkflows = exists
              ? settings.workflows.map((w) => (w.id === wf.id ? wf : w))
              : [...settings.workflows, wf];
            updateSettings({ workflows: nextWorkflows });
          }}
          onDeleteWorkflow={(id) => {
            updateSettings({
              workflows: settings.workflows.filter((w) => w.id !== id),
            });
          }}
          onRunWorkflow={(wf) => {
            setIsWorkflowManagerOpen(false);
            executeWorkflowWithApproval(wf);
          }}
          onClearHistory={() => {
            updateSettings({ workflowHistory: clearWorkflowHistoryLog() });
          }}
        />
        <div className="dialog-actions">
          <Button onClick={() => setIsWorkflowManagerOpen(false)} variant="primary">
            Done
          </Button>
        </div>
      </Dialog>

      <WorkflowPreviewDialog
        workflow={pendingWorkflowExecution?.workflow || null}
        {...(pendingWorkflowExecution?.reason ? { reason: pendingWorkflowExecution.reason } : {})}
        isOpen={Boolean(pendingWorkflowExecution)}
        onApprove={() => {
          if (pendingWorkflowExecution) {
            executeWorkflowWithApproval(pendingWorkflowExecution.workflow, true);
          }
        }}
        onCancel={() => setPendingWorkflowExecution(null)}
      />
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

function ProjectHealthPreview({
  cache,
  projectId,
  projects,
  targets,
}: {
  cache: NavodeSettings['integrationCache']['project-health'];
  projectId?: string;
  projects: NavodeSettings['projects'];
  targets: readonly ProjectHealthTarget[];
}) {
  const visibleTargets = projectId
    ? targets.filter((target) => target.projectId === projectId)
    : targets;
  if (!visibleTargets.length)
    return <p className="empty-text">No service health checks configured for this project.</p>;
  return (
    <div className="calendar-preview">
      {visibleTargets.map((target) => {
        const check = readProjectHealthCheck(cache, target.id);
        const project = projects.find((candidate) => candidate.id === target.projectId);
        return (
          <div className="preview-row" key={target.id}>
            <span>
              <strong>{target.label}</strong>
              <small>{formatHealthCheck(check, target.expectedStatus, project?.name)}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatHealthCheck(
  check: ReturnType<typeof readProjectHealthCheck>,
  expectedStatus: number,
  projectName?: string,
): string {
  const project = projectName ? `${projectName} · ` : '';
  if (!check) return `${project}Not checked yet · expected HTTP ${expectedStatus}`;
  const checkedAt = new Date(check.checkedAt);
  const timestamp = Number.isFinite(checkedAt.getTime()) ? ` · ${formatTime(checkedAt)}` : '';
  if (check.status === 'reachable')
    return `${project}Reachable · HTTP ${check.statusCode} · ${check.responseTimeMs ?? 0} ms${timestamp}`;
  if (check.status === 'unexpected-status')
    return `${project}Unexpected HTTP ${check.statusCode} · expected ${check.expectedStatus}${timestamp}`;
  if (check.status === 'offline') return `${project}Offline · last check deferred${timestamp}`;
  return `${project}Unreachable${timestamp}`;
}

function GitHubPreview({
  cache,
  connection,
  projects,
}: {
  cache: NavodeSettings['integrationCache']['github'];
  connection?: IntegrationConnection;
  projects: NavodeSettings['projects'];
}) {
  const state = getProviderWidgetState('github', cache, connection);
  const linkedProjects = projects.filter((project) => project.githubRepository);
  if (!linkedProjects.length)
    return <p className="empty-text">{state ?? 'No project is linked to a GitHub repository.'}</p>;
  return (
    <div className="calendar-preview">
      {state && <p className="muted">{state}</p>}
      {linkedProjects.slice(0, 3).map((project) => (
        <div className="preview-row" key={project.id}>
          <span>
            <strong>{project.name}</strong>
            <small>{formatProjectStatus(project, cache)}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

function getProviderWidgetState(
  providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  cache: NavodeSettings['integrationCache'][IntegrationId],
  connection?: IntegrationConnection,
): string | undefined {
  if (!connection || connection.status === 'disconnected')
    return 'Disconnected. Connect this integration to load live data.';
  if (connection.status === 'connecting') return 'Loading live data…';
  if (connection.status === 'error')
    return connection.error?.message ?? 'Could not refresh. Cached data remains available.';
  const definition = NAVODE_INTEGRATIONS.get(providerId);
  if (!definition || !cache) return 'Loading live data…';
  if (
    providerId === 'competitive-programming'
      ? isCodeforcesCacheStale(cache)
      : isCacheStale(cache, definition.refreshPolicy)
  )
    return 'Showing stale cached data. Refresh when ready.';
  return 'Showing cached data.';
}

function CalendarPreview({
  cache,
  connection,
}: {
  cache: NavodeSettings['integrationCache']['google-calendar'];
  connection?: IntegrationConnection;
}) {
  const context = readCalendarCachedContext(cache);
  const state = getProviderWidgetState('google-calendar', cache, connection);
  if (!context && state) return <p className="empty-text">{state}</p>;
  if (!context) return <p className="empty-text">Connect Google Calendar to see today’s events.</p>;
  const next = getNextCalendarEvent(context);
  return (
    <div className="calendar-preview">
      {state && <p className="muted">{state}</p>}
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
  connection,
  now,
}: {
  cache: NavodeSettings['integrationCache']['competitive-programming'];
  connection?: IntegrationConnection;
  now: Date;
}) {
  const context = readCodeforcesCachedContext(cache);
  const state = getProviderWidgetState('competitive-programming', cache, connection);
  if (!context && state) return <p className="empty-text">{state}</p>;
  if (!context)
    return (
      <p className="empty-text">Connect Competitive programming to see Codeforces contests.</p>
    );
  const next = getNextCodeforcesContest(context, now);
  return (
    <div className="calendar-preview">
      {state && <p className="muted">{state}</p>}
      <p className="muted">
        {next
          ? `Next: ${next.name} · ${formatCalendarTime(next.startAt)} · ${formatTimeUntil(next.startAt)}`
          : 'No upcoming Codeforces contests.'}
      </p>
      {context.profile && (
        <p className="muted">
          {context.profile.handle} · {context.profile.title ?? 'Unrated'}
          {context.profile.rating ? ` · ${context.profile.rating}` : ''}
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
      <a
        className="quick-link"
        href="https://codeforces.com/problemset"
        rel="noreferrer"
        target="_blank"
      >
        Practice Codeforces
      </a>
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
