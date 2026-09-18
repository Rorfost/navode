import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NAVODE_SETTINGS_STORAGE_KEY } from '@navode/core';
import { NavodeShell } from '@navode/ui';
import { getExtensionStorage } from './storage';
import './styles.css';

// The adapter centralizes browser storage for upcoming local-first features.
void getExtensionStorage().get(NAVODE_SETTINGS_STORAGE_KEY).catch(() => undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavodeShell onCommand={(command) => console.info('Navode command submitted:', command)} />
  </StrictMode>,
);
