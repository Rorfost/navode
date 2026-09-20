# V2 release: V3 account authentication

Navode uses Better Auth's Hono handler at `/api/auth/*` with its official
Drizzle adapter and PostgreSQL-backed sessions. V3.3 enables email/password
sign-up and sign-in only; no provider OAuth credentials are introduced here.
The handler issues HttpOnly session cookies, uses Better Auth's origin/CSRF
checks, keeps sessions for 14 days, refreshes them at most every 12 hours, and
requires a session less than 30 minutes old for sensitive operations that rely
on Better Auth's freshness check.

The API provides Better Auth's sign-up, sign-in, sign-out, session-list/revoke,
profile/password update, and delete-account endpoints. Passwords are never
logged or persisted by Navode code; Better Auth stores its password verifier in
`auth_accounts`. Account deletion is enabled only through Better Auth's
password/fresh-session guard and cascades account-owned server data.

Production requires `AUTH_SECRET` (at least 32 characters) and explicit
`AUTH_BASE_URL`; neither belongs in a browser bundle or Worker vars visible to
clients. `CORS_ALLOWED_ORIGINS` is also passed to Better Auth as its trusted
origin allowlist. The extension and web companion remain entirely usable
without a session. The shell defaults to the non-nagging **Local only** state;
future successful sync reports **Signed in / synced**, **Sync paused**, or
**Sync error**.
