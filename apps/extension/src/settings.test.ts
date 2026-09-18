import { DEFAULT_NAVODE_SETTINGS, NAVODE_SETTINGS_STORAGE_KEY } from '@navode/core';
import { describe, expect, it, vi } from 'vitest';
import { loadExtensionSettings, saveExtensionSettings } from './settings';
import type { LocalStorageAdapter } from './storage';

describe('extension settings persistence', () => {
  it('restores and saves settings through the Chrome storage adapter', async () => {
    const storage: LocalStorageAdapter = {
      get: vi.fn().mockResolvedValue({ ...DEFAULT_NAVODE_SETTINGS, theme: 'dark' }),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    await expect(loadExtensionSettings(storage)).resolves.toMatchObject({ theme: 'dark' });
    await saveExtensionSettings(storage, { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true });

    expect(storage.set).toHaveBeenCalledWith(NAVODE_SETTINGS_STORAGE_KEY, {
      ...DEFAULT_NAVODE_SETTINGS,
      onboardingCompleted: true,
    });
  });
});
