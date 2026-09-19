# Navode privacy policy

This is the source policy for the deployed `/privacy` page. Last updated September 19, 2026.

Navode stores the configuration and content a person creates: theme and motion preferences, search provider, aliases, quick links, projects, workspaces, scratchpad text, snippets, focus timer state, Today priorities, and a bounded recent-action list. Recent actions contain labels and timestamps, not search queries or snippet contents. V2.4 can additionally store an optional public Codeforces handle and short-lived public contest, profile, and recent-submission cache. It does not store provider credentials.

The extension uses Chrome local storage; the optional web companion uses browser local storage. V2.4 has no account system, cloud sync, Navode-hosted database, analytics, telemetry, or advertising identifiers. When a person explicitly connects Competitive programming, the extension requests optional access to `codeforces.com` and Navode sends only its public API requests for contests and, if configured, that public handle. No Codeforces API key is used. Codeforces data does not reach Navode infrastructure. Navode does not send configuration, notes, snippets, or activity to Navode servers.

When a person intentionally invokes a command that opens an external destination, their browser navigates to that site. The selected site receives the data normally carried by that navigation, such as a search query sent to a supported search provider or a user-selected URL. Navode does not control those sites’ privacy practices.

People can export a local JSON backup, reset individual sections in Settings, or reset all Navode data. Removing extension data in Chrome also deletes the extension’s locally stored Navode data. For privacy questions and support, contact [support@rorfost.com](mailto:support@rorfost.com).
