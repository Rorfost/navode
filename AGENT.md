# Working in Navode

## Before making changes

1. Read `README.md`, then this file.
2. Read the relevant files in `docs/` and inspect existing code and tests.
3. Identify the owning app or package before changing an interface.
4. Check existing scripts before documenting or running a command.

## Scope and design

- Change only what the request needs; avoid unrelated refactors.
- Preserve compatibility unless the task explicitly changes it.
- Do not silently change architecture. Keep domain logic outside presentation components and browser APIs behind adapters where practical.
- Prefer simple, explicit code. Do not add generic frameworks or dependencies for trivial helpers.

## Quality and documentation

Run the relevant formatter, lint, typecheck, tests, build, and targeted end-to-end checks before finishing. Report anything not run. Update docs when architecture, behavior, configuration, API contracts, storage, deployment, security, or user-facing configuration changes.

## Security

Never commit secrets, weaken CSP, log tokens or private data, or add extension permissions without documenting the reason. Validate imported and external data, including URLs; reject unsafe schemes such as `javascript:`.

## Code rules

- TypeScript is strict. Do not use `any` without a documented reason.
- Keep functions and components focused; comments explain why, not syntax.
- Do not leave disabled lint rules, unexplained TODOs, commented-out dead code, debug output, duplicate docs, backups, or temporary files.
- Keep shared packages independent of React and Chrome APIs unless their package purpose requires otherwise.

## Dependencies and commits

Check for an existing solution before adding a dependency. Prefer small, maintained packages and document architectural additions.

Make small logical commits with conventional-style prefixes when useful, for example `feat(extension): add new tab shell`. Do not mention coding agents or AI in commits. Do not push or merge unless explicitly instructed.
