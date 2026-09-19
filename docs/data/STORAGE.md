# Storage

## Ownership and locations

The extension owns its settings in `chrome.storage.local`. The web app may use browser local storage for small, non-sensitive settings; IndexedDB is reserved for future larger local datasets. No production database exists in V1.

## Versioning and migration

Persisted root data must include a schema version. The current Navode shell validates its versioned settings before use, migrating schema v1 to v2 with generic removable starter links and empty project/workspace collections, v2 to v3 with empty local productivity data, v3 to v4 with personalization defaults, v4 to v5 with empty integration connection and cache records, v5 to v6 with optional GitHub repository references on projects, and v6 to v7 with an empty optional Codeforces configuration. Malformed or unknown data falls back to safe defaults. Migrations are deterministic, tested, and run before data is used.

## Limits and privacy

Storage quotas vary by browser. Command history is bounded to 20 entries and stores action labels and timestamps only, not submitted queries, URLs, or snippet content. Scratchpad and snippets are stored only in the local settings record; snippet content is never included in command history. V2.4 stores only an optional public Codeforces handle, widget preference, public contest timing, public rating/title, and five recent submission summaries in a 15-minute cache. It must not store fine-grained tokens, OAuth tokens, API keys, or other credentials in settings. Custom aliases, quick links, project actions, and workspace items accept only public http/https URLs.
