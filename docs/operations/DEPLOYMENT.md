# Deployment

No production deployment is configured.

## Web companion and public site

The web app is a static Vite site prepared for Cloudflare Pages. Its public routes (`/`, `/privacy`, and `/support`) are served through the checked-in SPA redirect file; the local companion remains available at `/app`.

To deploy from an authorized machine:

1. Run `pnpm install --frozen-lockfile` and `pnpm build:web` from the repository root.
2. Create a Cloudflare Pages project named `navode-web`; set the production branch according to the release process.
3. Deploy `apps/web/dist` with `pnpm --filter @navode/api exec wrangler pages deploy apps/web/dist --project-name navode-web`.
4. Add the chosen public custom domain in Cloudflare Pages, then verify `/`, `/privacy`, `/support`, and `/app` after deployment.
5. Store Cloudflare API credentials only in the authorized shell or CI secret store. Do not commit tokens or account identifiers.

The optional `apps/web/wrangler.jsonc` contains no credentials. Configure only public build variables, such as `VITE_API_BASE_URL`, if a future feature has a legitimate use for them.

## API

The API is a Cloudflare Worker configured in `apps/api/wrangler.jsonc`. After Cloudflare credentials and environment configuration exist, run `pnpm --filter @navode/api deploy` from an authorized environment, then verify `GET /health`. Store credentials in GitHub Secrets—not source control.

## Chrome extension

Run `pnpm build:extension` and package the contents of `apps/extension/dist` for manual testing or future Chrome Web Store submission. The current manifest uses only the `storage` permission and has no content scripts or host permissions. Keep signing and publishing credentials outside this repository; use the public store-listing, privacy, and release documentation only after a deliberate publication process is approved.
