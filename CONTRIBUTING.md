# Contributing to Navode

## Setup

Use Node.js 22+ and pnpm 10+. Clone the repository, copy only the environment values you need from `.env.example`, and run `pnpm install --frozen-lockfile`. Full local instructions are in [docs/operations/LOCAL_DEVELOPMENT.md](docs/operations/LOCAL_DEVELOPMENT.md).

## Branches and commits

Use `<type>/<short-description>`, such as `feat/command-palette`, `fix/storage-migration`, or `docs/architecture-flow`. Keep commits focused and use concise conventional-style messages where useful.

## Pull requests

Explain the user need and main changes, attach screenshots for UI changes, list tests run, and mention documentation or security/permission impact. Keep pull requests narrowly scoped.

## Quality

Before opening a pull request, run the relevant `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and build commands. Add or update tests for changed behavior and update documentation when it is affected.

## Dependencies and security

Justify new dependencies and avoid adding browser permissions casually. Do not report vulnerabilities in public issues; follow the private reporting channel configured by the repository owner when one is available.
