export interface LocalStorageAdapter {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createChromeLocalStorageAdapter(
  storageArea: chrome.storage.StorageArea,
): LocalStorageAdapter {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const values = await storageArea.get(key);
      return values[key] as T | undefined;
    },
    async set<T>(key: string, value: T): Promise<void> {
      await storageArea.set({ [key]: value });
    },
    async remove(key: string): Promise<void> {
      await storageArea.remove(key);
    },
  };
}

export function getExtensionStorage(): LocalStorageAdapter {
  return createChromeLocalStorageAdapter(chrome.storage.local);
}
