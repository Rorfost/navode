# Import and export

Exports are JSON with an explicit backup schema version. The backup document version is separate from the version of the settings it contains:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-19T00:00:00.000Z",
  "data": {}
}
```

Exports contain all local Navode settings and user-owned data, including links, projects, workspaces, aliases, notes, snippets, timer state, priorities, and personalization preferences. Recent actions contain labels and timestamps only.

Imports are untrusted. Navode validates the complete JSON document with Zod before writing: document version, timestamp, size, supported settings version, URL protocols, and every persisted collection are checked. Validation errors leave the current state untouched. A valid import is shown as a count-based preview and replaces local settings only after confirmation; imports do not merge records or execute imported text as code. Unknown future backup or settings versions are rejected until a migration is available.
