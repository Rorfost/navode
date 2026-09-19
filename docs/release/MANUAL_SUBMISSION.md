# Navode 1.0.0 manual submission and verification

## Clean-profile verification

1. Run `pnpm package:extension` and confirm `artifacts/navode-1.0.0.zip` and its `.sha256` file exist.
2. In a clean Chrome profile, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**.
3. Select `apps/extension/dist` from the exact production build.
4. Open a new tab and verify onboarding, command search, quick links, projects, workspace confirmation, scratchpad, snippets, focus timer, Today priorities, settings, backup/import preview, reset, theme, reduced motion, and home-section controls.
5. Open DevTools for the New Tab page. Confirm normal use produces no console errors and an idle New Tab makes no network request. Intentionally opening a search or link may navigate to that destination.
6. Confirm Chrome displays no unexpected permission warning; V1 requests only `storage`.
7. Close Chrome, reopen the profile, and verify local settings and an active focus session resume as expected.
8. Verify the SHA-256 checksum with `Get-FileHash artifacts/navode-1.0.0.zip -Algorithm SHA256` on Windows or `sha256sum artifacts/navode-1.0.0.zip` on macOS/Linux.

## Chrome Web Store submission

1. Sign in to, or create, the repository owner’s Chrome Web Store Developer account and satisfy Chrome’s current account security requirements.
2. Create a new extension item in the Chrome Web Store Developer Dashboard.
3. Upload the exact `artifacts/navode-1.0.0.zip` file.
4. Complete **Store Listing** using `docs/release/CHROME_WEB_STORE.md` and the actual final screenshots.
5. Complete **Privacy practices** using the implemented-behavior answers in that document.
6. Add the deployed homepage, support, and privacy URLs.
7. Upload final icons and screenshots, choose the appropriate visibility/distribution options, and review the permission summary.
8. Submit the item for review. Do not claim publication or approval before Chrome accepts it.
9. After approval, record the Chrome-assigned extension ID in the owner’s release records and update any approved public configuration separately.
