# Infrastructure

Navode currently targets Cloudflare for the optional API and a future static/web deployment. No infrastructure resources, production deployments, or credentials are configured in this repository.

The Worker configuration lives at `apps/api/wrangler.jsonc`. Before enabling deployment, create the Cloudflare project/account configuration, add credentials as GitHub Secrets, and document the chosen production flow in `docs/operations/DEPLOYMENT.md`.
