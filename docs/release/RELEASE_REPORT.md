# Navode 1.0.0 release report

## Included features

Navode 1.0.0 provides a Manifest V3 New Tab override, command/search palette, safe search shortcuts, quick links, projects, workspaces, scratchpad, snippets, focus timer, Today priorities, keyboard navigation, theme and motion preferences, settings, local backup/import/reset, and public product/privacy/support pages.

## Permissions and privacy

The exact extension permission list is `storage`. It is used only for local persistence through `chrome.storage.local`. There are no optional permissions, host permissions, content scripts, browser-history access, tabs access, analytics, accounts, cloud sync, or remote executable code. User-created configuration stays local; external sites receive data only when a person deliberately opens or searches them.

## Package and checksum

The intended generated package path is `artifacts/navode-1.0.0.zip`; its checksum is written to `artifacts/navode-1.0.0.zip.sha256`. Both are ignored and must be generated from the exact production build with `pnpm package:extension`. The package command deliberately refuses to create either artifact until the required final icons exist.

## Known limitations

- No Chrome Web Store publication or approval exists yet.
- No user accounts, cloud sync, notifications, browser-history integration, or live third-party integrations are included.
- The public site must be deployed and its final domain inserted into the store listing before submission.

## Current release blockers

- Final production Navode icon assets do not yet exist in the repository. Do not package, submit, or use a placeholder icon.
- Actual clean-profile screenshots of the final build have not yet been captured. Do not use mock screenshots.
- Clean-profile Chrome verification remains manual because it requires a local Chrome profile and visual inspection; follow `docs/release/MANUAL_SUBMISSION.md` after the visual assets are supplied.

## Validation required before release

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build:web`, and `pnpm build:extension` from the release candidate commit. Record the exact results in the GitHub Release or release pull request.

After final production icons are committed, run `pnpm package:extension`. It must create the ZIP and checksum from the exact production build before submission.

## Remaining owner actions

Complete the blockers above, run the clean-profile checklist, deploy the public site, set the final public URLs, complete Chrome Web Store account/security requirements, upload the generated ZIP and real assets, submit for review, and record the extension ID only after approval.
