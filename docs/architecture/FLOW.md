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

The resolver supports public search aliases (`g`, `yt`, `gh`, `cf`, and `lc`), direct http/https URLs, custom aliases, and predictable local matches before using the selected provider as a fallback. Unsafe URL schemes produce a local error rather than navigation. It records only action labels and timestamps, never the input or search query. Project launch, focus, settings persistence, imports/exports, and optional API access follow the same rule: validate input at the boundary and keep the local feature independent of the API.
