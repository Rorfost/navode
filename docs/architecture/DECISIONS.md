# Architecture decisions

## ADR-001: Local-first product

**Status:** accepted for V1.

**Context:** Navode contains personal workflow data and must be fast on a new tab.

**Decision:** local storage is the primary source of truth; API use is optional.
**Consequences:** offline behavior is strong and privacy is simpler; cross-device sync is deferred.

## ADR-002: React and TypeScript

**Status:** accepted.

**Context:** web and extension need a shared maintainable UI.

**Decision:** use React with strict TypeScript and Vite.
**Consequences:** UI can be shared while framework-free logic stays in `packages/core`.

## ADR-003: Chrome Manifest V3

**Status:** accepted.

**Context:** Chrome extensions must use the current extension model.

**Decision:** implement the new-tab experience as an MV3 extension.
**Consequences:** the manifest starts with no runtime permissions; every future permission requires a documented reason.

## ADR-004: pnpm workspace monorepo

**Status:** accepted.

**Context:** web, extension, API, and shared code evolve together.

**Decision:** use pnpm workspaces without an additional task orchestrator initially.
**Consequences:** one lockfile and shared scripts; Turborepo can be considered only after repetition proves it useful.

## ADR-005: Optional Cloudflare API without a database

**Status:** accepted for initialization.

**Context:** future sync and integrations may need server helpers, but V1 does not.

**Decision:** provide only Hono `/health` and `/version` Worker endpoints.
**Consequences:** no accounts, OAuth, queues, Redis, or database are introduced prematurely.
