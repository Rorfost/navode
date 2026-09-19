# Navode

> Navode is a local-first personal browser command center that turns your Chrome New Tab into a fast
> starting point for search, links, projects, workspaces, snippets, notes, and focus sessions.

Navode = NAVigation + nODE — one central node for navigating your digital workflow.

## What is Navode?

Navode is a keyboard-first Chrome New Tab experience, with an optional web companion, for getting from intent to a useful destination without relying on an account or a network connection. Your configuration and the content you create stay in browser-local storage.

## Why Navode?

New tabs often become a detour through bookmarks, menus, and forgotten URLs. Navode keeps commonly used links, projects, workflows, notes, and focus tools in one calm, local-first starting point.

## Features

- Command palette with safe URL handling, built-in search aliases, custom aliases, and keyboard navigation.
- Quick links, projects, and confirmation-based workspace launches.
- Scratchpad, reusable snippets, a resumable focus timer, and up to three Today priorities.
- Theme, reduced-motion, onboarding, home-layout, search-provider, and focus-preset preferences.
- Validated local JSON backup, import preview, targeted resets, and versioned storage migrations.

## Screenshots

Release screenshots are not committed yet. They must be captured from the final production extension build in a clean Chrome profile before Chrome Web Store submission. See [store-assets/README.md](store-assets/README.md).

## How It Works

The Chrome extension replaces the New Tab page and stores Navode settings in `chrome.storage.local`. The optional web companion stores its settings in that browser's local storage. V1 has no accounts, cloud sync, analytics, telemetry, or Navode-hosted database. Navode contacts an external site only when you intentionally open a link or run a search/command that navigates there.

## Installation

Chrome Web Store release coming soon.

For local testing:

```sh
pnpm install
pnpm build:extension
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select `apps/extension/dist`, the build directory containing `manifest.json`.

## Local Development

Prerequisites: Node.js 22+ and pnpm 10+.

```sh
pnpm install
pnpm dev:web
```

Useful commands:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build:web
pnpm build:extension
```

See [local development documentation](docs/operations/LOCAL_DEVELOPMENT.md) for web, extension, and optional API commands.

## Tech Stack

React, TypeScript, Vite, Tailwind CSS, Manifest V3, Hono, Cloudflare Workers, Vitest, Playwright, ESLint, Prettier, and pnpm workspaces.

## Repository Structure

```text
apps/           Runnable web, extension, and API applications
packages/       Shared configuration, domain logic, and UI code
docs/           Product, architecture, engineering, and release guidance
infrastructure/ Deployment configuration and notes
store-assets/   Chrome Web Store asset instructions
```

## Privacy

V1 is local-first. The extension requests only Chrome's `storage` permission, used to persist Navode data in `chrome.storage.local`. It has no host permissions, content scripts, history, tabs, or scripting access. Read the full [privacy policy](docs/product/PRIVACY.md).

## Documentation

Start with the [architecture overview](docs/architecture/ARCHITECTURE.md), [security guidance](docs/engineering/SECURITY.md), [testing strategy](docs/engineering/TESTING.md), and [release documentation](docs/release/).

## Roadmap

V1 is the local-first core release. Future work is directional rather than committed:

- V2: expanded power-user workflows and developer utilities.
- V3: opt-in integrations.
- V4: carefully designed optional sync.
- V5: broader public-product improvements.

See the detailed [roadmap](docs/planning/ROADMAP.md).

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [AGENT.md](AGENT.md) before opening a pull request.

## Security

Do not report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md) for the current disclosure process.

## License

Navode is source-available proprietary software.

The source code is publicly accessible for viewing, educational reference, issue reporting,
security review, and contribution to the official project.

Redistribution, independent derivative distribution, rebranding, commercial use, and creation of
competing products using substantial portions of Navode are not permitted without written
authorization from Rorfost.

See [LICENSE](./LICENSE) for the complete terms.
