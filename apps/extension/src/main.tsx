import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_NAVODE_SETTINGS,
  createWorkspaceLaunchPlan,
  getCommandResults,
  recordRecentExecution,
  type CommandAction,
  type CommandCatalog,
  type CommandResult,
  type NavodeSettings,
  type Workspace,
} from '@navode/core';
import {
  GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE,
  NAVODE_INTEGRATIONS,
  fetchGoogleCalendarContext,
  isCacheStale,
  parseGitHubRepositoryReference,
  refreshGitHubRepositoryCache,
  requestIntegrationPermissions,
} from '@navode/integrations';
import { ErrorBoundary, NavodeShell } from '@navode/ui';
import { loadExtensionSettings, saveExtensionSettings } from './settings';
import { getExtensionStorage } from './storage';
import './styles.css';

const storage = getExtensionStorage();

function NavodeExtensionApp() {
  const [settings, setSettings] = useState(DEFAULT_NAVODE_SETTINGS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [canPersist, setCanPersist] = useState(false);
  const [storageNotice, setStorageNotice] = useState('');
  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null);
  const catalog = useMemo<CommandCatalog>(
    () => ({
      customAliases: settings.customAliases,
      defaultSearchProvider: settings.defaultSearchProvider,
      projects: settings.projects.map((project) => ({
        id: project.id,
        label: project.name,
        ...(project.githubRepository ? { githubRepository: project.githubRepository } : {}),
      })),
      quickLinks: settings.quickLinks
        .filter((link) => link.enabled)
        .map((link) => ({
          id: link.id,
          label: link.name,
          url: link.url,
          ...(link.alias ? { aliases: [link.alias] } : {}),
        })),
      snippets: settings.snippets.map((snippet) => ({
        id: snippet.id,
        label: snippet.title,
        ...(snippet.alias ? { aliases: [snippet.alias] } : {}),
      })),
      workspaces: settings.workspaces.map((workspace) => ({
        id: workspace.id,
        label: workspace.name,
      })),
    }),
    [
      settings.customAliases,
      settings.defaultSearchProvider,
      settings.projects,
      settings.quickLinks,
      settings.snippets,
      settings.workspaces,
    ],
  );

  useEffect(() => {
    void loadExtensionSettings(storage)
      .then((loadedSettings) => {
        document.documentElement.dataset.theme = loadedSettings.theme;
        document.documentElement.dataset.reducedMotion = loadedSettings.reducedMotion;
        setSettings(loadedSettings);
        setCanPersist(true);
      })
      .catch(() => {
        setSettings(DEFAULT_NAVODE_SETTINGS);
        setStorageNotice(
          'Navode could not load local settings, so it is using safe defaults. Your existing data was not overwritten.',
        );
      })
      .finally(() => setHasLoadedSettings(true));
  }, []);

  useEffect(() => {
    if (hasLoadedSettings) {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.dataset.reducedMotion = settings.reducedMotion;
      if (canPersist) {
        void saveExtensionSettings(storage, settings).catch(() => {
          setStorageNotice(
            'Navode could not save a recent change. Check browser storage availability before closing this tab.',
          );
        });
      }
    }
  }, [canPersist, hasLoadedSettings, settings]);

  useEffect(() => {
    const connection = settings.integrations.github;
    const references = settings.projects.flatMap((project) =>
      project.githubRepository ? [parseGitHubRepositoryReference(project.githubRepository)] : [],
    ).filter((reference) => reference !== null);
    if (connection?.status !== 'connected' || !references.length) return;
    const cache = settings.integrationCache.github ?? { entries: {} };
    void refreshGitHubRepositoryCache(cache, references).then((result) => {
      if (!result.refreshed && !result.error) return;
      setSettings((current) => ({
        ...current,
        integrationCache: { ...current.integrationCache, github: result.cache },
        integrations: {
          ...current.integrations,
          github: {
            ...connection,
            ...(result.error ? { error: result.error, status: 'error' as const } : {}),
            ...(result.refreshed ? { lastRefreshAt: new Date().toISOString() } : {}),
          },
        },
      }));
    });
  }, [settings.integrationCache.github, settings.integrations.github, settings.projects]);

  useEffect(() => {
    const connection = settings.integrations['google-calendar'];
    if (connection?.status !== 'connected' || !calendarAccessToken) return;
    const cache = settings.integrationCache['google-calendar'] ?? { entries: {} };
    const definition = NAVODE_INTEGRATIONS.get('google-calendar');
    if (!definition || !isCacheStale(cache, definition.refreshPolicy)) return;
    void fetchGoogleCalendarContext({ accessToken: calendarAccessToken }).then((result) => {
      if (result.kind === 'error') {
        setSettings((current) => ({
          ...current,
          integrations: {
            ...current.integrations,
            'google-calendar': { ...connection, error: result.error, status: 'error' },
          },
        }));
        return;
      }
      setSettings((current) => ({
        ...current,
        integrationCache: {
          ...current.integrationCache,
          'google-calendar': {
            entries: { ...cache.entries, context: { cachedAt: result.context.generatedAt, value: result.context } },
          },
        },
        integrations: {
          ...current.integrations,
          'google-calendar': { ...connection, lastRefreshAt: result.context.generatedAt },
        },
      }));
    });
  }, [calendarAccessToken, settings.integrationCache['google-calendar'], settings.integrations['google-calendar']]);

  useEffect(() => {
    const connection = settings.integrations['google-calendar'];
    if (connection?.status !== 'connected' || calendarAccessToken) return;
    void chrome.identity
      .getAuthToken({ interactive: false, scopes: [GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE] })
      .then((auth) => {
        if (auth.token) {
          setCalendarAccessToken(auth.token);
          return;
        }
        setSettings((current) => ({
          ...current,
          integrations: {
            ...current.integrations,
            'google-calendar': {
              ...connection,
              error: {
                code: 'authorization-expired',
                message: 'Google Calendar authorization expired. Reconnect to refresh events.',
                occurredAt: new Date().toISOString(),
              },
              status: 'error',
            },
          },
        }));
      })
      .catch(() => {
        setSettings((current) => ({
          ...current,
          integrations: {
            ...current.integrations,
            'google-calendar': {
              ...connection,
              error: {
                code: 'authorization-expired',
                message: 'Google Calendar authorization expired. Reconnect to refresh events.',
                occurredAt: new Date().toISOString(),
              },
              status: 'error',
            },
          },
        }));
      });
  }, [calendarAccessToken, settings.integrations['google-calendar']]);

  function connectIntegration(providerId: 'github' | 'google-calendar') {
    const definition = NAVODE_INTEGRATIONS.get(providerId);
    if (!definition) return;
    const currentConnection = settings.integrations[providerId];
    void requestIntegrationPermissions(
      definition,
      currentConnection?.status === 'error'
        ? { ...currentConnection, grantedPermissionIds: [] }
        : currentConnection ?? { enabled: false, status: 'disconnected', grantedPermissionIds: [] },
      {
        request: async () => {
          if (providerId === 'github') return chrome.permissions.request({ origins: ['https://api.github.com/*'] });
          const allowed = await chrome.permissions.request({
            permissions: ['identity'],
            origins: ['https://www.googleapis.com/*'],
          });
          if (!allowed) return false;
          const auth = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [GOOGLE_CALENDAR_EVENTS_READONLY_SCOPE],
          });
          if (!auth.token) return false;
          setCalendarAccessToken(auth.token);
          return true;
        },
      },
    ).then((connection) =>
      setSettings((current) => ({
        ...current,
        integrations: { ...current.integrations, [providerId]: connection },
      })),
    );
  }

  function updateSettings(next: NavodeSettings) {
    setSettings(next);
  }

  const resolveResults = useCallback(
    (input: string) => getCommandResults(input, catalog),
    [catalog],
  );

  function executeAction(action: CommandAction) {
    if (action.type === 'open-url') window.open(action.url, '_blank', 'noopener,noreferrer');
  }

  function handleCommandResult(result: CommandResult) {
    if (result.action.type === 'error') return;
    executeAction(result.action);
    setSettings((current) =>
      current.recordRecentActions
        ? { ...current, recentExecutions: recordRecentExecution(current.recentExecutions, result) }
        : current,
    );
  }

  function launchWorkspace(workspace: Workspace) {
    const plan = createWorkspaceLaunchPlan(workspace);
    if (!plan) return;
    plan.urls.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
    const result: CommandResult = {
      action: { type: 'launch-workspace', workspaceId: workspace.id },
      command: workspace.name,
      description: `Launch ${workspace.name}`,
      id: `workspace:${workspace.id}`,
      label: `Launch ${workspace.name}`,
      score: 100,
      source: 'workspace',
    };
    setSettings((current) =>
      current.recordRecentActions
        ? { ...current, recentExecutions: recordRecentExecution(current.recentExecutions, result) }
        : current,
    );
  }

  if (!hasLoadedSettings) {
    return <div className="navode-shell-skeleton" aria-hidden="true" />;
  }

  return (
    <NavodeShell
      onCommandResult={handleCommandResult}
      onIntegrationConnect={connectIntegration}
      onSettingsChange={updateSettings}
      onWorkspaceLaunch={launchWorkspace}
      resolveCommandResults={resolveResults}
      settings={settings}
      startupNotice={storageNotice}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <NavodeExtensionApp />
    </ErrorBoundary>
  </StrictMode>,
);
