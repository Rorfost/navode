import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DEFAULT_NAVODE_SETTINGS,
  getCommandResults,
  recordRecentExecution,
  type CommandAction,
  type CommandCatalog,
  type CommandResult,
  type NavodeSettings,
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
      quickLinks: [
        { id: 'google', label: 'Google', url: 'https://www.google.com' },
        { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com' },
        { id: 'github', label: 'GitHub', url: 'https://github.com' },
      ],
    }),
    [settings.customAliases, settings.defaultSearchProvider],
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

  return (
    <NavodeShell
      onCommandResult={handleCommandResult}
      onSettingsChange={updateSettings}
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
