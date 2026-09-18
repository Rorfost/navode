# API guidelines

The initial API exposes `GET /health` and `GET /version`; it is not required by local features. Future public endpoints should live under `/api/v1` unless a platform health endpoint needs a simpler path.

Use JSON responses, Zod validation at every request boundary, stable error objects (`code`, `message`, optional request ID), and structured logs that redact credentials. Define CORS per known client needs, not as a wildcard convenience. Authentication and rate limiting are deferred until an endpoint needs them; document their design before adding them.
