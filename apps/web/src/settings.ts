import {
  DEFAULT_NAVODE_SETTINGS,
  NAVODE_SETTINGS_STORAGE_KEY,
  parseNavodeSettings,
  type NavodeSettings,
} from '@navode/core';

export function loadWebSettings(): NavodeSettings {
  try {
    const raw = window.localStorage.getItem(NAVODE_SETTINGS_STORAGE_KEY);
    return raw ? parseNavodeSettings(JSON.parse(raw) as unknown) : DEFAULT_NAVODE_SETTINGS;
  } catch {
    return DEFAULT_NAVODE_SETTINGS;
  }
}

export function saveWebSettings(settings: NavodeSettings): boolean {
  try {
    window.localStorage.setItem(NAVODE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
