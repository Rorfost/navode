# Navode privacy policy

This is the source policy for the deployed `/privacy` page. Last updated September 19, 2026.

Navode stores the configuration and content a person creates: theme and motion preferences, search provider, aliases, quick links, projects, workspaces, scratchpad text, snippets, focus timer state, Today priorities, and a bounded recent-action list. Recent actions contain labels and timestamps, not search queries or snippet contents. V2.2 can additionally store a chosen GitHub `owner/repository` reference, non-secret repository status, and rate-limit/error state. It does not store provider credentials.

The extension uses Chrome local storage; the optional web companion uses browser local storage. V2.2 has no account system, cloud sync, Navode-hosted database, analytics, telemetry, or advertising identifiers. When a person explicitly connects GitHub and configures a repository, Navode requests optional access to `api.github.com` and sends that repository reference to GitHub to retrieve status. Public repositories work without authentication. Any fine-grained read-only token supplied by a host implementation remains in memory and is not written to Navode storage. Navode does not send configuration, notes, snippets, or activity to Navode servers.

When a person intentionally invokes a command that opens an external destination, their browser navigates to that site. The selected site receives the data normally carried by that navigation, such as a search query sent to a supported search provider or a user-selected URL. Navode does not control those sites’ privacy practices.

People can export a local JSON backup, reset individual sections in Settings, or reset all Navode data. Removing extension data in Chrome also deletes the extension’s locally stored Navode data. For privacy questions and support, contact [support@rorfost.com](mailto:support@rorfost.com).
