# Navode privacy policy

This is the source policy for the deployed `/privacy` page. Last updated September 20, 2026.

Navode stores the configuration and content a person creates: theme and motion preferences, search provider, aliases, quick links, projects, workspaces, scratchpad text, snippets, focus timer state, Today priorities, live-widget preferences, and a bounded recent-action list. Recent actions contain labels and timestamps, not search queries or snippet contents. V2 can additionally store non-secret integration connection metadata; short-lived GitHub repository status, Google Calendar daily context, and public Codeforces context; plus configured project-health URLs and their short-lived local results. It does not store provider credentials in Navode settings.

The extension uses Chrome local storage; the optional web companion uses browser local storage. V2 has no account system, cloud sync, Navode-hosted database, analytics, telemetry, or advertising identifiers. GitHub, Google Calendar, and Codeforces are contacted only after explicit connection; Calendar access is read-only, and Codeforces uses no API key. Project-health checks contact only the exact URL a person configures, directly from their browser, and may be unavailable when browser or provider policy blocks the request. Integration data does not reach Navode infrastructure. Navode does not send configuration, notes, snippets, or activity to Navode servers.

When a person intentionally invokes a command that opens an external destination, their browser navigates to that site. The selected site receives the data normally carried by that navigation, such as a search query sent to a supported search provider or a user-selected URL. Navode does not control those sites’ privacy practices.

People can export a local JSON backup, reset individual sections in Settings, or reset all Navode data. Removing extension data in Chrome also deletes the extension’s locally stored Navode data. For privacy questions and support, contact [support@rorfost.com](mailto:support@rorfost.com).
