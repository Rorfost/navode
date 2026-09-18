# Major flows

## Open a new tab

```mermaid
sequenceDiagram
  participant U as User
  participant C as Chrome
  participant E as Navode extension
  participant S as Local storage
  U->>C: Open new tab
  C->>E: Load index.html
  E->>S: Read local configuration
  E-->>U: Render command shell
```

Initial rendering must be independent of a network request.

## Execute a command

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Command palette
  participant Core as Command resolver
  participant B as Browser
  U->>UI: Submit "yt segment tree"
  UI->>Core: Parse and resolve alias
  Core-->>UI: Valid command and argument
  UI->>B: Open validated destination
```

Unknown commands should produce a useful local error rather than opening an unsafe URL. Project launch, focus, settings persistence, imports/exports, and optional API access follow the same rule: validate input at the boundary and keep the local feature independent of the API.
