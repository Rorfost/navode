# V2 release: V3 sync architecture

## Status and decisions

V3 keeps Navode local-first. A device continues to read and write its validated
local settings immediately; cloud sync is optional and cannot be required to
open a new tab. The production stack is Hono on Cloudflare Workers, Cloudflare
Hyperdrive, Neon PostgreSQL, Drizzle ORM/Kit, and Better Auth. See ADR-006
through ADR-010 in [DECISIONS.md](DECISIONS.md).

Hyperdrive is the only database connection path used by a deployed Worker. It
keeps the origin connection string outside the Worker environment and manages
the connection pool. `DATABASE_URL` exists only for an authorized migration
runner and local database integration tests.

Better Auth is mounted at `/api/auth/*` in V3.3. It owns email/password account
registration, sign-in/out, database-backed sessions, session revocation,
account settings, and account deletion. V3.2's secured API routes no longer
accept a homemade bearer token or client-supplied user identifier.

## Data ownership and classification

| Classification         | Examples                                                                      | Handling                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public metadata        | API version, health status, schema version                                    | May be returned unauthenticated; never includes deployment secrets.                                          |
| Personal configuration | Theme, links, aliases, workspaces, layout                                     | Stored in the encrypted database volume only after opted-in sync; every row has `user_id`.                   |
| Private content        | Scratchpad, snippets, priorities, focus state                                 | Same ownership rule as configuration; omitted from request logs and diagnostics.                             |
| Credentials            | Provider OAuth refresh/access tokens and authorization codes                  | Never stored in sync documents or logs. V3.6 stores encrypted secrets behind a reference only.               |
| Operational logs       | Request ID, route template, status, latency, redacted actor/device references | Structured, access-restricted, retention-limited; no request/response bodies, tokens, URLs, or note content. |

The account owner controls all synced data. A device is a revocable client of
one account, not an owner of server data. Service operators may access only the
minimum operational metadata necessary for support and incident response.

## Local-first sync protocol

1. A local mutation is validated and committed to the local settings adapter.
   The client adds an immutable mutation envelope to its durable offline queue:
   `operationId`, local timestamp, device ID, document type, base revision and
   a bounded payload.
2. When authenticated and online, the client sends queued operations in order.
   The server authenticates the session and device, checks document ownership,
   and records a monotonically increasing revision in one transaction.
3. Retrying an `operationId` returns its recorded outcome rather than creating
   a second revision. The server response includes the current revision.
4. The client applies acknowledged remote state to a separate sync layer, then
   reconciles it with its local copy. Network or server failure leaves the local
   state and queue intact.

V3.4 synchronizes entity records—not one opaque global JSON blob—for quick
links, projects, workspaces, aliases, snippets, Today items, preferences, and
integration configuration metadata. Shared core logic retains per-entity
version counters, operation IDs, tombstones, pending local operations, and
explicit conflict records. Scratchpad and recent history deliberately remain
local-only by default because their convenience value does not justify syncing
private freeform content or activity metadata automatically.

`GET` and `POST /api/v1/sync/settings` provide the account-owned server
revision boundary. A write requires an active account device, a UUID operation
ID, and its base revision. The database records idempotency keys and rejects a
stale base revision with a typed conflict response; clients reconcile that
response through the shared entity-level sync engine.

## Conflicts, deletion, and backups

V3.4 uses operation IDs, base revisions and per-record modification times.
Independent records merge automatically; the same record changed concurrently
uses a deterministic latest-write rule, preserves the losing revision for a
short recovery window, and tells the user what happened. Destructive operations
write tombstones rather than immediately erasing data. A client must never
silently overwrite an unseen server revision.

V3.5 owns user-visible cloud backups and restore. Backups are immutable,
account-scoped snapshots. Their list endpoint omits snapshot contents; restore
requires an explicit confirmation and returns data for a client-controlled
local replacement, rather than silently mutating a device. They remain until
account-data deletion while no automatic expiry policy is configured. Account
deletion uses Better Auth's fresh-session/password guard and database cascades
to remove account-owned sessions, devices, primary data, backups, credential
records, and security events. It never removes a browser-local copy.

## Provider credentials

Provider credentials remain out of browser storage where the provider and
platform permit it. V3.6 provides a narrowly typed credential boundary for
GitHub and Google Calendar OAuth refresh tokens: it AES-GCM encrypts them with
versioned Worker-managed keys, binds ciphertext to its owner and provider as
additional authenticated data, and persists ciphertext in `provider_credentials`.
The boundary has no endpoint that returns a secret. Sync documents contain
neither tokens nor token-like values. Existing V2 extension-only provider flows
remain local until a provider-specific migration with user consent is approved.

## Deployment boundaries

Browser clients call only versioned `/api/v1` endpoints from an explicit CORS
allowlist. The Worker emits a generated request ID and redacted structured log
event. It receives database access through a Hyperdrive binding; migrations run
out-of-band from an authorized environment with the direct database URL. A
deployment is ready only when configuration is valid and the database readiness
query succeeds.
