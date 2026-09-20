# Testing strategy

Use Vitest for domain and API unit tests, React Testing Library for component tests, and Playwright for important web flows. The web foundation includes component tests for the public pages and shell, plus browser checks for public navigation and the new-tab command flow. Test core command parsing, alias resolution, result ranking, URL validation, fallback search, bounded history, organizational CRUD, ordering, workspace launch planning, imports, and migrations independently from React and Chrome APIs. Extension checks include storage-adapter tests, manifest validation, a production build, unpacked loading, new-tab override, permission review, and a self-only CSP/no-dynamic-code bundle check with a 750 KB JavaScript budget.

V2 integration tests also cover provider registration, progressive permission requests, enabled/disabled connections, cache freshness, refresh failures, and backoff. Codeforces tests cover bad handles, public API outage behavior, contest time normalization/order/state, no-contest state, cached-data freshness, mapping, and `cf` command generation. These tests keep provider failures isolated from New Tab startup.

Project-health tests cover unsafe URLs, expected and unexpected statuses, offline mode, abortable timeout behavior, network/CORS limitations, cached-state freshness, schema migration, and `status` / `health <project>` command resolution. Browser permission checks verify that extension origin access is requested only for a saved target URL.

Coverage is a signal, not a target. Critical workflows—command execution, persistence/migration, import validation, and new-tab startup—must have meaningful automated tests plus manual checks where browser behavior cannot be automated reliably.

V3 API tests cover request IDs, explicit CORS rejection/allowance, typed error
responses, fail-closed authentication, readiness behavior, and PostgreSQL
schema integration through PGlite. The database integration suite must prove
that an owner-scoped repository cannot return another user's document.
