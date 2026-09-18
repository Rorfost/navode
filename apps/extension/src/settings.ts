import {
  NAVODE_SETTINGS_STORAGE_KEY,
  parseNavodeSettings,
  type NavodeSettings,
} from '@navode/core';
import type { LocalStorageAdapter } from './storage';

export async function loadExtensionSettings(storage: LocalStorageAdapter): Promise<NavodeSettings> {
  return parseNavodeSettings(await storage.get<unknown>(NAVODE_SETTINGS_STORAGE_KEY));
}

export function saveExtensionSettings(storage: LocalStorageAdapter, settings: NavodeSettings): Promise<void> {
  return storage.set(NAVODE_SETTINGS_STORAGE_KEY, settings);
}
