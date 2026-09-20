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

## Refresh an integration

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Settings or widget
  participant C as Refresh coordinator
  participant S as Local cache
  participant P as Provider
  UI->>C: Refresh only when user requests or cache is stale
  C->>S: Read cached provider data first
  alt Cache is fresh or provider is in backoff
    C-->>UI: Render cached data
  else Refresh is needed
    C->>P: Refresh one enabled provider
    P-->>C: Data or error
    C->>S: Save refreshed cache or retain prior cache
    C-->>UI: Updated data or provider-local error
  end
```

A provider failure never prevents the New Tab shell from starting. V2.2's GitHub provider reads local cache first, requests the `api.github.com` origin only after the user connects it, and refreshes configured repositories only after the 10-minute cache window. A rate-limited response retains cached data and delays retry until GitHub's indicated reset time.

## Connect and refresh Calendar

```mermaid
sequenceDiagram
  participant U as User
  participant E as Extension
  participant I as Chrome identity
  participant G as Google Calendar API
  U->>E: Connect Google Calendar
  E->>I: Request identity and calendar.events.readonly
  I-->>E: In-memory access token
  E->>G: Read today's primary-calendar events
  G-->>E: Events or authorization/API error
  E-->>U: Cached daily context or cached-data notice
```

No Gmail or Drive scopes are requested. The extension never sends Calendar data to Navode infrastructure.

## Connect and refresh Codeforces

```mermaid
sequenceDiagram
  participant U as User
  participant E as Host
  participant C as Codeforces API
  U->>E: Connect Competitive programming
  E->>E: Request codeforces.com optional origin (extension only)
  E->>C: Read public contests
  opt Public handle configured
    E->>C: Read public profile and recent submissions
  end
  E-->>U: Store bounded local cache or retain prior cache on error
```

The adapter uses Codeforces' documented public API and spaces calls to respect its public rate limit. It never asks for a Codeforces API key or stores credentials.

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

The resolver supports public search aliases (`g`, `yt`, `gh`, `cf`, and `lc`), direct http/https URLs, custom aliases, and predictable local matches before using the selected provider as a fallback. Unsafe URL schemes produce a local error rather than navigation. It records only action labels and timestamps, never the input or search query. Workspace launches first show the number of destinations and open tabs only after confirmation. Project launch, focus, settings persistence, imports/exports, and optional API access follow the same rule: validate input at the boundary and keep the local feature independent of the API.
