/**
 * NavodeBrowserAdapter — abstraction over browser storage and identity APIs.
 *
 * This interface allows core logic and shared UI to work across:
 * - the Chrome extension (chrome.storage.local, chrome.identity)
 * - the web companion (localStorage)
 * - test environments (in-memory mock)
 *
 * Adapters must not leak credentials, tokens, or private data into logs.
 * The extension adapter wires chrome.storage.local; the web adapter wraps
 * localStorage. Both implementations are in the respective app packages
 * (apps/extension and apps/web) so this package stays Chrome-API-free.
 */
export interface NavodeBrowserAdapter {
  /**
   * Storage adapter for persisting Navode settings and state.
   */
  storage: {
    /**
     * Reads a value by key. Returns null if the key is not present.
     * Implementations must not throw; return null on error.
     */
    get(key: string): Promise<unknown | null>;
    /**
     * Writes a value for a key.
     */
    set(key: string, value: unknown): Promise<void>;
    /**
     * Removes a key.
     */
    remove(key: string): Promise<void>;
  };
  /**
   * Optional identity adapter for OAuth flows (extension-only).
   * Not available in the web companion or test environments.
   */
  identity?: {
    /**
     * Launches an OAuth interactive flow and returns the redirect URL
     * (containing the auth code or token), or null if the user cancelled.
     */
    launchWebAuthFlow(options: { url: string; interactive: boolean }): Promise<string | null>;
  };
  /**
   * Optional runtime adapter for extension-specific commands.
   */
  runtime?: {
    /** Opens the extension options page if available. */
    openOptionsPage(): void;
  };
}

/**
 * In-memory browser adapter for use in tests and the web companion.
 * Stores data in a plain object map; not persisted across reloads.
 */
export class LocalStorageAdapter implements NavodeBrowserAdapter {
  private readonly store: Map<string, unknown>;

  constructor(initialData: Record<string, unknown> = {}) {
    this.store = new Map(Object.entries(initialData));
  }

  readonly storage = {
    get: (key: string): Promise<unknown | null> => {
      return Promise.resolve(this.store.has(key) ? (this.store.get(key) ?? null) : null);
    },
    set: (key: string, value: unknown): Promise<void> => {
      this.store.set(key, value);
      return Promise.resolve();
    },
    remove: (key: string): Promise<void> => {
      this.store.delete(key);
      return Promise.resolve();
    },
  };
}
