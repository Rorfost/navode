# Contributing to Navode

Thanks for helping improve Navode. Keep contributions focused, reviewable, and aligned with its local-first privacy model.

## Prerequisites and setup

- Node.js 22+
- pnpm 10+

```sh
pnpm install
```

Copy values from `.env.example` only when a local workflow needs them. Do not commit `.env`, `.dev.vars`, credentials, exported Navode data, or browser-profile data. See [local development](docs/operations/LOCAL_DEVELOPMENT.md) for app-specific commands.

## Architecture overview

`apps/web` is the optional React/Vite companion, `apps/extension` is the Manifest V3 Chrome New Tab experience, and `apps/api` is the optional Hono Worker. `packages/core` contains framework-free domain and validation logic, `packages/ui` contains reusable React UI, and `packages/config` contains shared non-secret constants. Read [the architecture guide](docs/architecture/ARCHITECTURE.md) before changing a boundary.

## Branches

Use a descriptive branch name, for example:

- `feat/command-name`
- `fix/storage-bug`
- `docs/topic`
- `test/module`
- `refactor/module`
- `chore/task`

## Coding rules

- Use strict TypeScript and focused, accessible components.
- Validate external and imported data at boundaries; allow only safe URLs.
- Keep domain logic out of presentation components and browser APIs behind adapters where practical.
- Do not add extension permissions, telemetry, remote executable code, or dependencies without a documented need.
- Do not log secrets, tokens, imported private data, or noisy debug output.
- Avoid unrelated rewrites, dead code, disabled lint rules, and unexplained TODOs.

The full rules are in [AGENT.md](AGENT.md) and [docs/engineering/CODE_RULES.md](docs/engineering/CODE_RULES.md).

## Testing and documentation

Run the checks relevant to your change before opening a pull request:

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build:web
pnpm build:extension
```

Update documentation whenever behavior, architecture, storage, security, configuration, permissions, or release steps change. Add or update tests for changed behavior.

## Commits and pull requests

Use concise, conventional-style commit messages where useful, such as `fix(core): reject unsafe import URL`. Do not mention AI tools or coding agents in commit messages.

In a pull request, explain the user or engineering need, summarize the change, list validation performed, and call out documentation, privacy, or permission impact. Include screenshots for visible UI changes when useful. Keep pull requests narrowly scoped.

## Dependency additions

Prefer existing solutions and small, maintained dependencies. Explain why a dependency is needed, its maintenance and supply-chain considerations, its license compatibility, and any bundle-size or browser-permission effect in the pull request.
