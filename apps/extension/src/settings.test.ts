import { DEFAULT_NAVODE_SETTINGS, NAVODE_SETTINGS_STORAGE_KEY } from '@navode/core';
import { describe, expect, it, vi } from 'vitest';
import { loadExtensionSettings, saveExtensionSettings } from './settings';
import { createChromeLocalStorageAdapter, type LocalStorageAdapter } from './storage';

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

  it('persists onboarding completion state across new tab open and browser reload', async () => {
    let mockStore: Record<string, unknown> = {};
    const storageArea = {
      get: vi.fn().mockImplementation((key: string) => Promise.resolve({ [key]: mockStore[key] })),
      set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
        mockStore = { ...mockStore, ...items };
        return Promise.resolve();
      }),
      remove: vi.fn().mockImplementation((key: string) => {
        delete mockStore[key];
        return Promise.resolve();
      }),
    } as unknown as chrome.storage.StorageArea;

    const storage = createChromeLocalStorageAdapter(storageArea);

    // 1. Fresh install: settings default to onboardingCompleted: false
    const initialSettings = await loadExtensionSettings(storage);
    expect(initialSettings.onboardingCompleted).toBe(false);

    // 2. User completes onboarding: save onboardingCompleted: true
    await saveExtensionSettings(storage, { ...initialSettings, onboardingCompleted: true });

    // 3. New tab opens / Chrome restarts: loadExtensionSettings restores onboardingCompleted: true
    const reloadedSettings = await loadExtensionSettings(storage);
    expect(reloadedSettings.onboardingCompleted).toBe(true);
  });
});
