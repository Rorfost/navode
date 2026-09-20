# Changelog

All notable changes to Navode are documented here.

## [2.0.0] - 2026-09-20

### Added

- Optional GitHub, Google Calendar, Codeforces, and project-health integrations with cached, failure-isolated home widgets.
- Provider-aware commands, manual refresh controls, and configurable opt-in live-widget visibility.
- Secure disconnect behavior that removes integration caches and clears the in-memory Calendar token.
- V3 sync-phase foundations: optional accounts, PostgreSQL-backed API,
  local-first sync state, account-owned devices, immutable cloud backups, and
  encrypted provider credential storage.
- Operations guidance for database migration, restore, health/readiness,
  content-free observability, explicit first-sync enrollment, and verified
  account-data cascade deletion.

### Changed

- Expanded privacy, permission, testing, and Chrome Web Store release guidance for V2 integrations.

## [1.0.0] - 2026-09-19

### Added

- Manifest V3 Chrome New Tab experience with keyboard-first command search and safe search shortcuts.
- Local quick links, projects, workspaces, scratchpad, snippets, focus sessions, and Today priorities.
- Theme, motion, home-layout, alias, focus-preset, onboarding, history, backup, import, and reset controls.
- Versioned local storage migrations and validated JSON backup/restore previews.
- Public product, privacy, and support pages for the optional web companion.

### Fixed

- Hardened extension startup, storage recovery, permission policy, CSP, packaged-code checks, and accessible UI states for the V1 release.
- Removed the legacy Cloudflare redirect rule that conflicts with the Worker Assets SPA fallback.

### Changed

- Aligned release documentation and repository licensing with Navode's source-available proprietary model.
