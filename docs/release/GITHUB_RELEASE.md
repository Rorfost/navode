# GitHub release process

This process creates the GitHub release after the public-release pull request has been reviewed and merged. It does not change repository visibility, deploy the web companion, or submit the Chrome extension.

## Flow

1. Create a focused feature branch and open a pull request against `main`.
2. Require review and relevant validation checks, then merge the approved pull request into `main`.
3. On `main`, run release validation: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build:web`, and `pnpm build:extension`.
4. Complete the clean-profile extension checks in [MANUAL_SUBMISSION.md](MANUAL_SUBMISSION.md).
5. Create and push the immutable tag `v1.0.0` only after validation and release assets are ready.
6. Create the GitHub Release from that tag with the title `Navode v1.0.0 — Core`.
7. Attach `navode-1.0.0.zip` and, when generated, `navode-1.0.0.zip.sha256`.
8. Submit the same validated extension package to the Chrome Web Store using [CHROME_WEB_STORE.md](CHROME_WEB_STORE.md). Do not claim Chrome Web Store availability until it is approved and visible.

## Release asset generation

Run this from the repository root after final production icons are committed and `pnpm build:extension` succeeds:

```sh
pnpm package:extension
```

The command creates ignored local artifacts:

- `artifacts/navode-1.0.0.zip`
- `artifacts/navode-1.0.0.zip.sha256`

Verify the checksum before publishing:

```sh
Get-FileHash artifacts/navode-1.0.0.zip -Algorithm SHA256
```

## V1 release gate

Do not create the tag or GitHub Release until the final extension icons, clean-profile screenshots, validation results, and manual Chrome checks are complete.
