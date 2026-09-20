# V3 sync threat model

## Scope

This model covers the optional Navode account, API, PostgreSQL data store,
device registry, sync queue, backups, and future provider credential service.
It does not change the V1/V2 local-only behavior for people who do not opt in.

| Threat                        | Primary controls                                                                                                                                             | Detection and recovery                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Stolen session or token       | Secure, HttpOnly, `Secure`, `SameSite` sessions; short session lifetime; rotation; per-device sessions; no tokens in local storage or logs                   | Revoke the affected session/device, force re-authentication, retain a redacted security event.      |
| Account takeover              | Verified email flow, rate limits, recovery controls, optional MFA decision before launch, re-authentication for destructive actions                          | Notify the account owner; revoke all sessions/devices and investigate security events.              |
| Cross-user access             | Auth context is server-derived; every query filters by `user_id`; compound ownership indexes; database integration tests for isolation                       | Alert on authorization anomalies; no client-provided account ID is trusted.                         |
| Compromised extension storage | Treat local data as private but potentially exposed by a compromised profile; do not persist server sessions/tokens there; require account re-authentication | Device revocation stops future sync; local data must be cleared by the user or browser policy.      |
| Leaked OAuth credential       | OAuth redirect validation, PKCE/state, least scopes, encryption in the V3.6 credential boundary, opaque references only                                      | Revoke at provider, delete the reference, rotate keys if warranted.                                 |
| Replay or duplicated mutation | UUID operation IDs, device binding, base revision, transactional idempotency uniqueness, bounded replay retention                                            | Return prior acknowledged result; investigate impossible device/session combinations.               |
| Accidental deletion           | Confirmation, tombstones, retained revisions, backup/restore, account-deletion grace period                                                                  | Restore into a new revision; never silently discard concurrent work.                                |
| Sync conflict                 | Server revisions, per-record metadata, deterministic merge policy, user-visible conflict result                                                              | Preserve short-lived revision history and let the user choose a recovery version.                   |
| Sensitive logs                | Structured allowlisted fields, redaction, no bodies, URLs, content, cookies, authorization headers, or credentials                                           | Restricted log access and retention; scrub an incident if a new sensitive field is found.           |
| Database or migration failure | Source-controlled reviewed SQL, least-privilege migration role, tested restore, readiness checks, backups                                                    | Halt rollout, restore or forward-fix with a reviewed migration; do not hand-edit production schema. |

## Security invariants

- An authenticated identity is the sole source of `user_id`; request JSON,
  headers, and URLs cannot select another owner.
- Authentication routes and future write routes fail closed if their configured
  limiter, auth service, or database is unavailable.
- Every user-data table has a non-null `user_id`, a foreign key, and an
  ownership-oriented index.
- Database and browser logs must be useful without containing user content,
  credentials, cookies, authorization values, or full external URLs.
- Cloud data is an optional replica. It cannot cause local unsynced work to be
  discarded merely because a device is offline.
