# Infrastructure

Navode targets Cloudflare for the optional API and static web companion. No infrastructure resources, production deployments, or credentials are configured in this repository.

The Worker configuration lives at `apps/api/wrangler.jsonc`; the static Pages configuration lives at `apps/web/wrangler.jsonc`. Before enabling deployment, create the Cloudflare project/account configuration, add credentials as GitHub Secrets, and follow the production steps in `docs/operations/DEPLOYMENT.md`.
