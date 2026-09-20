# Logical data model

This is a client-side conceptual model, not a database schema.

| Entity                          | Purpose                                                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `UserSettings`                  | Theme, preferences, storage version, and UI settings.                                                                       |
| `QuickLink`                     | Named validated URL and display metadata.                                                                                   |
| `Command` / `CommandAlias`      | A command template and its user-facing aliases.                                                                             |
| `Workspace` / `WorkspaceAction` | A grouped workflow and ordered destinations/actions.                                                                        |
| `Project`                       | A named project associated with workspaces and shortcuts, with an optional validated GitHub `owner/repository` reference.   |
| `FocusPreset`                   | Duration and focus-mode defaults.                                                                                           |
| `Scratchpad` / `Snippet`        | Locally owned plain-text notes and reusable text. Snippets may be tagged or given an alias, but are not credential storage. |
| `FocusTimer` / `TodayItem`      | A resumable local focus session and up to three intentionally small daily priorities.                                       |
| `CalendarContext`               | A short-lived local view of today's read-only Google Calendar events and timezone.                                          |
| `CodeforcesContext`             | A bounded public contest list, optional public profile, and recent submission summaries.                                    |
| `ProjectHealthTarget`           | A user-configured, validated http(s) service URL with label, optional project reference, and expected HTTP status.          |
| `ProjectHealthCheck`            | The last local reachability/status/timing observation for one configured service target.                                    |
| `RecentAction`                  | Local, bounded history for convenience.                                                                                     |

Quick links carry an enabled state, display order, optional grouping/alias/icon, and a home-preview choice. Projects own editable typed URL actions and may reference one GitHub repository; workspaces own ordered URL destinations and require a launch confirmation. All IDs should be stable opaque strings. The persisted settings root is currently schema v9; it migrates earlier schemas deterministically. Scratchpad and snippet text never leave local storage, and snippets must not be used for passwords or tokens.

`IntegrationWidgetPreferences` records which optional Calendar, GitHub, competitive-programming, and project-health widgets appear on the home screen. All begin disabled; this setting and every provider cache remain device-local.

## V3 cloud foundation

The optional V3 server schema adds `users`, `auth_accounts`, `devices`,
`sync_documents`, `sync_revisions`, `document_mutation_keys`,
`credential_references`, and `security_events`. All cloud records containing
user data have a non-null `user_id` and supporting ownership index. A sync
document is one account-owned, typed settings replica; revisions are
server-ordered and mutation keys make device retries idempotent. Credential
references are opaque pointers only—never provider tokens. The physical typed
schema and SQL migration are in `apps/api/src/db/schema.ts` and
`apps/api/migrations/`.

Calendar context is stored under the Google Calendar integration cache and contains only daily event title, all-day state, start/end values, safe event link, generated timestamp, and timezone. It is never sent to Navode infrastructure and excludes access tokens, attendees, descriptions, locations, reminders, attachments, and conferencing details.

Codeforces context is stored under the competitive-programming integration cache and contains only public contest identifiers/names/start times/durations, an optional configured public handle with public rating/title, and up to five public submission summaries. It excludes API keys, source code, and private account data.

Project-health targets and last-check results are stored locally. A result contains only the configured target ID, observed HTTP status when available, expected status, response time when available, and timestamp. Failed, offline, or browser-blocked requests retain prior cached results and do not send URL lists or results to Navode infrastructure.
