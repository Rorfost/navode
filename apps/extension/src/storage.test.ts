import { describe, expect, it, vi } from 'vitest';
import { createChromeLocalStorageAdapter } from './storage';

describe('Chrome local storage adapter', () => {
  it('keeps Chrome storage access behind a typed interface', async () => {
    const storageArea = {
      get: vi.fn().mockResolvedValue({ theme: 'dark' }),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as chrome.storage.StorageArea;
    const storage = createChromeLocalStorageAdapter(storageArea);

    await expect(storage.get<string>('theme')).resolves.toBe('dark');
    await storage.set('theme', 'light');
    await storage.remove('theme');

    expect(storageArea.set).toHaveBeenCalledWith({ theme: 'light' });
    expect(storageArea.remove).toHaveBeenCalledWith('theme');
  });
});
