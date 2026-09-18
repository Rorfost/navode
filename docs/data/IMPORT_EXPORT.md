# Import and export

Exports are JSON with an explicit schema version:

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-09-19T00:00:00.000Z",
  "settings": {},
  "commands": [],
  "projects": [],
  "workspaces": []
}
```

Imports must validate the complete file before writing. Unknown future versions are rejected with an actionable message. A supported partial import must report skipped invalid records and never overwrite unrelated local data without confirmation. Imports are untrusted: validate schema, size, URL protocol, and display content; do not import secrets or execute command text as code.
