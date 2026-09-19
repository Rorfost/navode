# Architecture

Navode is a pnpm workspace monorepo. The local-first interface is usable without the optional API.

```mermaid
flowchart LR
  U[User] --> E[Chrome extension]
  U --> W[Web app]
  E --> UI[Shared UI]
  W --> UI
  UI --> C[Shared core]
  E --> S[chrome.storage.local]
  W --> L[Browser local storage]
  E -. optional .-> A[Hono API]
  W -. optional .-> A
  A -. future .-> D[(Cloud data store)]
```

## Boundaries

- `apps/web`: React/Vite implementation of the Navode shell.
- `apps/extension`: React/Vite Manifest V3 new-tab implementation. It uses the `storage` permission only, via a local-storage adapter.
- `apps/api`: optional Hono Worker with health and version endpoints only.
- `packages/core`: framework-free command resolver, URL-safety validation, alias/history and organizational CRUD domain logic, plus versioned storage-schema migrations.
- `packages/integrations`: framework-free provider definitions, connection and permission concepts, cache-first refresh coordination, and provider-local error/backoff handling. It does not hold credentials or access browser APIs.
- `packages/ui`: reusable React presentation components shared by web and extension, including the app shell, dialogs, controls, and command-result affordances. It receives settings through props rather than reading browser APIs.
- `packages/config`: shared non-secret application constants.

V2.2 activates GitHub and V2.3 activates Google Calendar in the extension through the official `chrome.identity` OAuth flow. V2.4 activates the competitive-programming provider with a Codeforces-only adapter: it requests the optional `codeforces.com` origin only when connected, uses documented public API endpoints, and accepts an optional public handle. The adapter owns Codeforces types and API mapping so another platform can be added without affecting the shared integration model. The core package must not depend directly on React or Chrome APIs.

## Data and deployment

The extension owns its settings in `chrome.storage.local` through `apps/extension/src/storage.ts`; web storage is browser-local. Theme, onboarding completion, reduced-motion and home preferences, default provider, aliases, bounded non-sensitive action history, links, projects, workspaces, productivity data, integration connection metadata, and provider caches use a shared versioned settings model in `packages/core`, with host-specific persistence adapters. Schema v1 through v6 migrate deterministically to the current v7 before use. V2.4 adds an optional validated public Codeforces handle and a removable-widget preference, plus a bounded 15-minute public contest/profile/submission cache. Integration credentials are not part of this settings record.
