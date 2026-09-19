# Storage

## Ownership and locations

The extension owns its settings in `chrome.storage.local`. The web app may use browser local storage for small, non-sensitive settings; IndexedDB is reserved for future larger local datasets. No production database exists in V1.

## Versioning and migration

Persisted root data must include a schema version. The current Navode shell validates its versioned settings before use, migrating schema v1 to v2 with generic removable starter links and empty project/workspace collections, v2 to v3 with empty local productivity data, v3 to v4 with personalization defaults, then v4 to v5 with empty integration connection and cache records. Malformed or unknown data falls back to safe defaults. Migrations are deterministic, tested, and run before data is used. Failed migrations must retain the original data long enough to offer export or reset rather than silently discarding it.

## Limits and privacy

Storage quotas vary by browser. Command history is bounded to 20 entries and stores action labels and timestamps only, not submitted queries, URLs, or snippet content. Scratchpad and snippets are stored only in the local settings record; snippet content is never included in command history. Active focus timers persist their intended end time so a refresh can calculate remaining time. V2.1 stores only integration enabled/status metadata, permission identifiers, non-secret refresh errors, and bounded validated cache entries. It must not store OAuth tokens, API keys, or other credentials in settings. Custom aliases, quick links, project actions, and workspace items accept only public http/https URLs. Avoid storing secrets in plain text, and never assume local storage is a secure credential vault. Optional sync must be explicit and separately designed.
