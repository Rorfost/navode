# Storage

## Ownership and locations

The extension owns its settings in `chrome.storage.local`. The web app may use browser local storage for small, non-sensitive settings; IndexedDB is reserved for future larger local datasets. No production database exists in V1.

## Versioning and migration

Persisted root data must include a schema version. The current Navode shell validates its versioned theme and onboarding settings before use and falls back to safe defaults for malformed or unknown data. Migrations are deterministic, tested, and run before data is used. Failed migrations must retain the original data long enough to offer export or reset rather than silently discarding it.

## Limits and privacy

Storage quotas vary by browser. Keep command history bounded, avoid storing secrets in plain text, and never assume local storage is a secure credential vault. Optional sync must be explicit and separately designed.
