# Deployment

No production deployment is configured.

## Web companion and public site

The web app is a static Vite site prepared for Cloudflare Workers Assets. Its public routes (`/`, `/privacy`, and `/support`) use the Worker SPA fallback configured in `apps/web/wrangler.jsonc`; the local companion remains available at `/app`.

To deploy from an authorized machine:

1. Run `pnpm install --frozen-lockfile` and `pnpm build:web` from the repository root.
2. Review the Worker name and asset settings in `apps/web/wrangler.jsonc`.
3. Deploy with `pnpm --filter @navode/api exec wrangler deploy --config ../web/wrangler.jsonc`.
4. Add the chosen public custom domain to the Worker, then verify `/`, `/privacy`, `/support`, and `/app` after deployment.
5. Store Cloudflare API credentials only in the authorized shell or CI secret store. Do not commit tokens or account identifiers.

The optional `apps/web/wrangler.jsonc` contains no credentials. Configure only public build variables, such as `VITE_API_BASE_URL`, if a future feature has a legitimate use for them.

## API

The API is a Cloudflare Worker configured in `apps/api/wrangler.jsonc`. V3 adds
the `nodejs_compat` flag required by the PostgreSQL/auth stack. Bind its
production Hyperdrive configuration as `HYPERDRIVE`, configure explicit
`CORS_ALLOWED_ORIGINS`, apply reviewed database migrations from an authorized
runner, then deploy. Verify both `GET /health` and `GET /ready`; the latter must
not pass without PostgreSQL. Store credentials in GitHub Secrets—not source
control. See [DATABASE_MIGRATIONS.md](DATABASE_MIGRATIONS.md),
[OBSERVABILITY.md](OBSERVABILITY.md), and [V2_SYNC_MIGRATION.md](V2_SYNC_MIGRATION.md).

## Chrome extension

Run `pnpm build:extension` and package the contents of `apps/extension/dist` for manual testing or future Chrome Web Store submission. The current manifest uses only the `storage` permission and has no content scripts or host permissions. Keep signing and publishing credentials outside this repository; use the public store-listing, privacy, and release documentation only after a deliberate publication process is approved.
