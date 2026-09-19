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
  NAVODE_INTEGRATIONS,
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

  function connectIntegration(providerId: 'github') {
    const definition = NAVODE_INTEGRATIONS.get(providerId);
    if (!definition) return;
    void requestIntegrationPermissions(
      definition,
      settings.integrations[providerId] ?? { enabled: false, status: 'disconnected', grantedPermissionIds: [] },
      {
        request: async () =>
          chrome.permissions.request({ origins: ['https://api.github.com/*'] }),
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
