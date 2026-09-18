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
import { NavodeShell } from '@navode/ui';
import { loadExtensionSettings, saveExtensionSettings } from './settings';
import { getExtensionStorage } from './storage';
import './styles.css';

const storage = getExtensionStorage();

function NavodeExtensionApp() {
  const [settings, setSettings] = useState(DEFAULT_NAVODE_SETTINGS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const catalog = useMemo<CommandCatalog>(
    () => ({
      customAliases: settings.customAliases,
      defaultSearchProvider: settings.defaultSearchProvider,
      projects: settings.projects.map((project) => ({ id: project.id, label: project.name })),
      quickLinks: settings.quickLinks
        .filter((link) => link.enabled)
        .map((link) => ({ id: link.id, label: link.name, url: link.url, ...(link.alias ? { aliases: [link.alias] } : {}) })),
      workspaces: settings.workspaces.map((workspace) => ({ id: workspace.id, label: workspace.name })),
    }),
    [settings.customAliases, settings.defaultSearchProvider, settings.projects, settings.quickLinks, settings.workspaces],
  );

  useEffect(() => {
    void loadExtensionSettings(storage)
      .then(setSettings)
      .catch(() => undefined)
      .finally(() => setHasLoadedSettings(true));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    if (hasLoadedSettings) void saveExtensionSettings(storage, settings).catch(() => undefined);
  }, [hasLoadedSettings, settings]);

  function updateSettings(next: NavodeSettings) {
    setSettings(next);
  }

  const resolveResults = useCallback((input: string) => getCommandResults(input, catalog), [catalog]);

  function executeAction(action: CommandAction) {
    if (action.type === 'open-url') window.open(action.url, '_blank', 'noopener,noreferrer');
  }

  function handleCommandResult(result: CommandResult) {
    if (result.action.type === 'error') return;
    executeAction(result.action);
    setSettings((current) => ({
      ...current,
      recentExecutions: recordRecentExecution(current.recentExecutions, result),
    }));
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
    setSettings((current) => ({ ...current, recentExecutions: recordRecentExecution(current.recentExecutions, result) }));
  }

  return (
    <NavodeShell
      onCommandResult={handleCommandResult}
      onSettingsChange={updateSettings}
      onWorkspaceLaunch={launchWorkspace}
      resolveCommandResults={resolveResults}
      settings={settings}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavodeExtensionApp />
  </StrictMode>,
);
