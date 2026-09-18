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
| `ScratchNote` / `Snippet` | Locally owned short-form content. |
| `IntegrationConfig` | Non-secret configuration for an opt-in integration. |
| `HealthTarget` | A user-configured status destination. |
| `RecentAction` | Local, bounded history for convenience. |

All IDs should be stable opaque strings. Data introduced later must carry a schema version where migration is necessary.
