# Local development

## Prerequisites

Install Node.js 22+ and pnpm 10+. Enable Corepack if your Node installation requires it. Copy values from `.env.example` only when needed; no secrets are required for the starter shell. The repository's first lockfile must be generated with `pnpm install`; afterwards use `pnpm install --frozen-lockfile` for reproducible installs.

## Install and run

```sh
pnpm install
pnpm dev:web
pnpm dev:extension
pnpm dev:api
```

`pnpm dev` is an alias for the web app. Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` for repository-wide validation. Use `pnpm test:e2e` after adding Playwright test cases.

## Load the extension

1. Run `pnpm build:extension`.
2. Open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
3. Select `apps/extension/dist`.
4. Open a new tab and verify the Navode shell loads.

The starter extension requires no runtime permissions. Its development command watches a Vite build; reload the unpacked extension after changes.
