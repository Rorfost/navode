import type { NavodeBrowserAdapter } from '@navode/core';

// Typed local-storage adapter used by settings.ts and tests
export interface LocalStorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createChromeLocalStorageAdapter(
  area: chrome.storage.StorageArea,
): LocalStorageAdapter {
  return {
    async get<T>(key: string): Promise<T | null> {
      const result = await area.get(key);
      return (result[key] as T) ?? null;
    },
    async set(key: string, value: unknown): Promise<void> {
      await area.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await area.remove(key);
    },
  };
}

export function getExtensionStorage(): LocalStorageAdapter {
  return createChromeLocalStorageAdapter(chrome.storage.local);
}

export function createChromeBrowserAdapter(): NavodeBrowserAdapter {
  return {
    storage: {
      async get(key: string): Promise<unknown | null> {
        const values = await chrome.storage.local.get(key);
        return values[key] ?? null;
      },
      async set(key: string, value: unknown): Promise<void> {
        await chrome.storage.local.set({ [key]: value });
      },
      async remove(key: string): Promise<void> {
        await chrome.storage.local.remove(key);
      },
    },
    identity: {
      async launchWebAuthFlow({ url, interactive }): Promise<string | null> {
        try {
          const redirectUrl = await chrome.identity.launchWebAuthFlow({ url, interactive });
          return redirectUrl ?? null;
        } catch (error) {
          console.warn('OAuth flow failed or cancelled:', error);
          return null;
        }
      },
    },
    runtime: {
      openOptionsPage() {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('index.html'), '_blank');
        }
      },
    },
  };
}

export const extensionBrowserAdapter = createChromeBrowserAdapter();
