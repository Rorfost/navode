# V2 release observability (V3 sync phase)

## Signals and privacy boundary

The API emits structured, content-free events suitable for a Cloudflare log
sink or error-monitoring integration:

| Signal               | Source                        | Use                                                   |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| Uptime               | `GET /health`                 | Worker liveness probe                                 |
| Dependency readiness | `GET /ready`                  | Hyperdrive/PostgreSQL probe                           |
| Request latency      | `api.request.durationMs`      | p50/p95/p99 latency dashboard by route and status     |
| Errors               | `api.error`                   | Error-rate alerting by typed error code and route     |
| Rate limits          | `api.rate_limit`              | Capacity/abuse visibility by route and retry duration |
| Account security     | `GET /api/v1/security-events` | Signed-in user's device-revocation history            |

Events contain only request ID, route path, HTTP method, status, duration, and
typed error/rate-limit metadata. They must not contain request bodies, synced
data, note content, URLs, cookies, IP addresses, user agents, or credentials.
The security-event endpoint is owner-scoped and records only allowlisted event
metadata.

## Production operations

Before enabling production sync, configure an authorized observability sink
with a 30-day maximum retention for API logs and alerts for sustained readiness
failure, elevated 5xx rate, and materially increased p95 latency. Navode does
not configure a third-party monitoring vendor in source because that requires a
deployment account, endpoint, and data-processing review. Verify the sink with
a synthetic health/readiness request before releasing.

Cloudflare Workers provides the runtime and Hyperdrive connection; the selected
PostgreSQL provider stores account data. Document the exact deployed account
and any monitoring vendor in the deployment record before collecting data.

## Environments

`development` is local and may use local-only clients. `staging` is optional;
when used it must have isolated Cloudflare, Hyperdrive, database, auth secret,
CORS origins, and monitoring data. `production` requires HTTPS origins and an
`AUTH_SECRET`. Preview deployments do not receive production database access or
credential-encryption keys. No environment may place `DATABASE_URL` in Worker
variables.
