# Deployment

No production deployment is configured.

## Web

The intended target is Cloudflare static/web hosting. Before enabling it, create the Cloudflare project, define preview and production environments, configure only public build variables such as `VITE_API_BASE_URL`, and add a separately reviewed deployment workflow. Validate the build before deployment.

## API

The API is a Cloudflare Worker configured in `apps/api/wrangler.jsonc`. After Cloudflare credentials and environment configuration exist, run `pnpm --filter @navode/api deploy` from an authorized environment, then verify `GET /health`. Store credentials in GitHub Secrets—not source control.

## Chrome extension

Run `pnpm build:extension` and package the contents of `apps/extension/dist` for manual testing or future Chrome Web Store submission. Store listing, privacy, and signing/publishing information outside this repository until a deliberate publication process is approved.
