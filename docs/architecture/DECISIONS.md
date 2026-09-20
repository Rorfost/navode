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
**Consequences:** the manifest requests only `storage` for local persistence; every future permission requires a documented reason.

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

## ADR-006: Cloudflare Workers and Hono for the V3 API

**Status:** accepted for V3.

**Context:** V3 needs a versioned API without making the browser clients depend on
a conventional always-on server.

**Decision:** retain Hono and deploy the API as a Cloudflare Worker. API routes
live under `/api/v1`; operational health routes remain unversioned.

**Consequences:** Web-standard request handling is shared with the existing API;
runtime configuration, connection lifecycle, and Node compatibility must be
handled explicitly for Worker-safe database/auth libraries.

## ADR-007: Neon PostgreSQL via Cloudflare Hyperdrive

**Status:** accepted for V3.

**Context:** sync requires transactional data ownership and durable revision
history; Workers must not create unmanaged database pools.

**Decision:** use a single-primary Neon PostgreSQL database accessed by deployed
Workers only through Cloudflare Hyperdrive. The direct `DATABASE_URL` is limited
to local development and an authorized migration runner.

**Consequences:** PostgreSQL is the source of truth for cloud state; Hyperdrive
keeps the origin credential out of Worker variables and owns pooled connections.

## ADR-008: Drizzle schema and checked-in SQL migrations

**Status:** accepted for V3.

**Context:** V3 needs typed database access and reproducible deployment.

**Decision:** define PostgreSQL tables in Drizzle and commit generated/reviewed
SQL migrations. Production deploys run the migration runner before the Worker;
`drizzle-kit push` is not a production workflow.

**Consequences:** schema drift is prohibited. A migration is forward-only by
default, has an explicit recovery note, and is exercised by database integration
tests before release.

## ADR-009: Better Auth for account lifecycle

**Status:** accepted; implementation deferred to V3.3.

**Context:** account security requires maintained session, provider, verification,
and lifecycle primitives rather than a custom token system.

**Decision:** use Better Auth’s Hono integration with PostgreSQL. Until V3.3
mounts it, V3.2 secured routes use a fail-closed authentication boundary.

**Consequences:** V3.2 adds no production sign-in endpoint or token format;
Better Auth schema changes must be introduced as reviewed migrations in V3.3.

## ADR-010: Server revisions and idempotent mutation envelopes

**Status:** accepted for V3.

**Context:** devices can edit offline, retry requests, and reconnect out of order.

**Decision:** cloud documents have server-issued monotonic revisions; mutations
carry a device-bound operation ID and base revision. Deletes are tombstoned until
the documented recovery window ends.

**Consequences:** sync has deterministic ordering and safe retries, while the
client remains able to edit locally without a network connection.
