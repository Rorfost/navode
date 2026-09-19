# Chrome Web Store listing — Navode 1.0.0

This document is the source of truth for the manual Chrome Web Store submission. Navode is not published until Chrome accepts and makes the item visible.

## Listing copy

| Field              | Value                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Extension name     | Navode                                                                                                |
| Short description  | A local-first command center for a faster, more useful New Tab.                                       |
| Category           | Productivity                                                                                          |
| Language           | English (United States)                                                                               |
| Homepage URL       | `https://<navode-public-domain>/` — replace with the deployed public domain before submission.        |
| Support URL        | `https://<navode-public-domain>/support` — replace with the deployed public domain before submission. |
| Privacy policy URL | `https://<navode-public-domain>/privacy` — replace with the deployed public domain before submission. |
| Package            | `artifacts/navode-1.0.0.zip` (generated, ignored release artifact)                                    |

### Detailed description

Navode is a local-first personal browser command center that turns your New Tab into a fast starting point for search, links, projects, workspaces, snippets, notes, and focus sessions.

Use the keyboard-first command bar to search supported providers, open safe links, launch intentional workspaces, and reach your Navode tools. Keep frequently used links and project actions close, capture a short scratchpad note, reuse snippets, run a focus timer that survives refreshes, and set up to three priorities for today.

Navode keeps its V1 configuration on your device. You can control the layout, theme, motion, aliases, focus presets, and action history. Export a validated local JSON backup before making changes, restore it with a replacement preview, or reset local data when needed.

### Single purpose

Navode replaces the default New Tab page with a personal, local-first navigation and focus starting point.

## Privacy practices and disclosures

Answer based on the shipped 1.0.0 build only:

- **Does the extension collect or transmit user data to Navode?** No. V1 has no accounts, analytics, telemetry, cloud sync, or Navode-hosted database.
- **What stays local?** Settings, aliases, links, projects, workspaces, scratchpad text, snippets, focus timer state, Today priorities, and bounded recent-action labels/timestamps.
- **When can data leave the device?** Only when the user intentionally navigates to an external site or invokes a search/command. The destination receives the normal navigation information, such as the requested search query or selected URL.
- **Does Navode read browser history, tabs, or page content?** No.
- **Does Navode use remote code?** No. All executable code is packaged in the extension.
- **Is data sold, shared, or used for advertising?** No.

## Permission justification

| Permission | Why it is needed                                                                        |
| ---------- | --------------------------------------------------------------------------------------- |
| `storage`  | Saves local-first Navode settings and user-created data through `chrome.storage.local`. |

The 1.0.0 manifest has no optional permissions, host permissions, content scripts, history, top-sites, tabs, or scripting access.

## Store assets checklist

- [ ] Final Navode icon in 16, 32, 48, and 128 pixel PNG sizes is packaged and referenced by the manifest.
- [ ] Final high-resolution icon source/reference is recorded in `store-assets/README.md`.
- [ ] Actual release screenshots and captions are present in `store-assets/captures/`.
- [ ] Screenshots show the real 1.0.0 extension, not mockups or development-only UI.
- [ ] Optional promotional artwork, if used, reflects the shipped interface.

## Pre-submission checklist

- [ ] Build and package the exact release artifact with `pnpm package:extension`.
- [ ] Verify `artifacts/navode-1.0.0.zip.sha256` against the generated ZIP.
- [ ] Load the exact `apps/extension/dist` build into a clean Chrome profile and complete the verification in `docs/release/MANUAL_SUBMISSION.md`.
- [ ] Deploy the public site and replace all `<navode-public-domain>` values above.
- [ ] Re-read `/privacy`, this disclosure section, `README.md`, and `apps/extension/public/manifest.json` for consistency.
- [ ] Confirm the Chrome Web Store upload shows only the expected `storage` permission warning.
