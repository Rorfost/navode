# Runbook

| Symptom | First checks |
| --- | --- |
| Web build fails | Run `pnpm typecheck`, then `pnpm build:web`; inspect the first error and workspace dependency versions. |
| Extension build fails | Run `pnpm build:extension`; ensure `dist/manifest.json` and `dist/index.html` exist. |
| Extension does not load | Rebuild, reload the unpacked extension, and inspect `chrome://extensions` errors. |
| New-tab override fails | Confirm the loaded extension is enabled and its manifest has `chrome_url_overrides.newtab: index.html`. |
| Storage migration error | Preserve/export current data if possible, inspect schema version and migration tests, then use the documented reset path only as a last resort. |
| API unavailable | Run `pnpm dev:api`, check Worker configuration and `/health`; do not make local features depend on it. |
| Deployment fails | Validate the relevant build, Cloudflare configuration, environment variables, and credentials; do not retry blindly. |
| Integration or import is broken | Treat input as untrusted, inspect validation results and URL scheme, and avoid logging private configuration. |
