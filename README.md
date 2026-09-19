# Navode

Navode is a personal browser command center for navigation, workflows, projects, tools, and daily focus. Its name combines **NAVigation** and n**ODE**: one central node for moving through a digital workflow.

## Why Navode

Opening a new tab should be the fastest path from intent to action—not a detour through bookmarks, menus, and forgotten URLs. Navode is keyboard-first, local-first, and designed to remain useful without an account or network connection.

## Status

Navode 1.0.0 is a release candidate, not yet published in the Chrome Web Store. The web app and extension provide a local-first command shell with onboarding, accessible keyboard navigation, quick links, projects, workspaces, scratchpad, snippets, focus tools, backups, and public privacy/support pages. The optional API exposes only health and version metadata.

## Architecture

This pnpm monorepo contains a React/Vite web app, a React Manifest V3 Chrome new-tab extension, an optional Hono/Cloudflare Workers API, and shared TypeScript packages. See [architecture documentation](docs/architecture/ARCHITECTURE.md).

## Tech stack

- React, TypeScript, Vite, Tailwind CSS, and lightweight client state foundations
- Chrome Extension Manifest V3
- Hono on Cloudflare Workers for the optional API
- Vitest, Playwright, ESLint, Prettier, and GitHub Actions

## Repository structure

```text
apps/       Runnable web, extension, and API applications
packages/   Shared domain and UI code
docs/       Product, architecture, engineering, and operations guidance
infrastructure/  Deployment configuration and notes
```

## Getting started

Prerequisites: Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev:web
```

Commit the generated `pnpm-lock.yaml`, then use `pnpm install --frozen-lockfile` for reproducible installs. See [local development](docs/operations/LOCAL_DEVELOPMENT.md) for all commands, including extension loading and API development.

## Development commands

```sh
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

## Chrome extension

Build with `pnpm build:extension`, then load `apps/extension/dist` as an unpacked extension in Chrome. The starter manifest overrides the new-tab page and requests only Chrome's `storage` permission for local persistence.

## Web app and API

Run the web app with `pnpm dev:web`. Run the optional API with `pnpm dev:api`; it provides `GET /health` and `GET /version` only.

## Documentation

The [docs](docs/) directory is the source of truth for the product scope, architecture, coding rules, storage, security, tests, deployment, and roadmap.

## Security

Navode is local-first. Do not commit secrets, broaden extension permissions without documentation, or treat imported configuration as trusted. See [security guidance](docs/engineering/SECURITY.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENT.md](AGENT.md) before making changes.

## License

Copyright © 2026 Rorfost. All rights reserved. This private repository is proprietary; see [LICENSE](LICENSE).
