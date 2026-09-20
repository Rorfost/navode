# API guidelines

The API exposes unauthenticated `GET /health`, `GET /ready`, and `GET /version`;
they are not required by local features. Product endpoints live under `/api/v1`
(currently `GET /status` and the fail-closed auth-boundary check `GET /me`).
Health is liveness only; readiness confirms the PostgreSQL connection path.

Use JSON responses, Zod validation at every request boundary, stable error objects
(`code`, `message`, optional details and request ID), and structured logs that
redact credentials. Each response has `X-Request-ID`; supplied IDs are accepted
only when they meet the safe opaque-ID format. Define CORS per known client
needs, not as a wildcard convenience.

V3.2 authentication is a fail-closed interface, not an interim token scheme.
V3.3 mounts Better Auth and derives the actor only from its validated session.
Rate limiting is injected at the API boundary; production authentication and
write routes must use Cloudflare's managed rate limiting plus account/device
limits before they are exposed.
