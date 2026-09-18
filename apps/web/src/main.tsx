import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  getCommandResults,
  recordRecentExecution,
  type CommandAction,
  type CommandCatalog,
  type CommandResult,
  type NavodeSettings,
} from '@navode/core';
import { NavodeShell } from '@navode/ui';
import { loadWebSettings, saveWebSettings } from './settings';
import './styles.css';

function NavodeWebApp() {
  const [settings, setSettings] = useState(loadWebSettings);
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
    document.documentElement.dataset.theme = settings.theme;
    saveWebSettings(settings);
  }, [settings]);

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
    <NavodeWebApp />
  </StrictMode>,
);
