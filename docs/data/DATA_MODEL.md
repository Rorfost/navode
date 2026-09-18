# Logical data model

This is a client-side conceptual model, not a database schema.

| Entity | Purpose |
| --- | --- |
| `UserSettings` | Theme, preferences, storage version, and UI settings. |
| `QuickLink` | Named validated URL and display metadata. |
| `Command` / `CommandAlias` | A command template and its user-facing aliases. |
| `Workspace` / `WorkspaceAction` | A grouped workflow and ordered destinations/actions. |
| `Project` | A named project associated with workspaces and shortcuts. |
| `FocusPreset` | Duration and focus-mode defaults. |
| `Scratchpad` / `Snippet` | Locally owned plain-text notes and reusable text. Snippets may be tagged or given an alias, but are not credential storage. |
| `FocusTimer` / `TodayItem` | A resumable local focus session and up to three intentionally small daily priorities. |
| `IntegrationConfig` | Non-secret configuration for an opt-in integration. |
| `HealthTarget` | A user-configured status destination. |
| `RecentAction` | Local, bounded history for convenience. |

Quick links carry an enabled state, display order, optional grouping/alias/icon, and a home-preview choice. Projects own editable typed URL actions; workspaces own ordered URL destinations and require a launch confirmation. All IDs should be stable opaque strings. The persisted settings root is currently schema v4; it migrates earlier schemas deterministically. Scratchpad and snippet text never leave local storage, and snippets must not be used for passwords or tokens.
