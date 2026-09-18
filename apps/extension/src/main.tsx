import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_NAVODE_SETTINGS, type NavodeSettings } from '@navode/core';
import { NavodeShell } from '@navode/ui';
import { loadExtensionSettings, saveExtensionSettings } from './settings';
import { getExtensionStorage } from './storage';
import './styles.css';

const storage = getExtensionStorage();

function NavodeExtensionApp() {
  const [settings, setSettings] = useState(DEFAULT_NAVODE_SETTINGS);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

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

  return <NavodeShell onSettingsChange={updateSettings} settings={settings} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavodeExtensionApp />
  </StrictMode>,
);
