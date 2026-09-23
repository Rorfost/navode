# Navode Chrome Web Store assets

This directory is release-preparation material and is never included in the extension ZIP.

## Required before submission

- The approved Navode source artwork is in [`assets/`](../assets/): `navode-icon.png`,
  `navode-logo.png`, and `navode-banner.png`.
- The extension packages PNG icon variants at 16, 32, 48, and 128 pixels from the approved icon.
- Record the asset owner and export date here before submission.
- Capture screenshots from the exact `apps/extension/dist` production build in a clean Chrome profile and place them in `store-assets/captures/`.
- Add a short caption for each screenshot in `store-assets/CAPTIONS.md`.

The submitted listing must use the approved icon variants and clean-profile screenshots. Screenshots
are still required before Chrome Web Store submission.

## V2 captures

The V2 release set must additionally show the opt-in live-widget chooser, at least one connected widget, and one disconnected or cached-error widget state. Capture them from the exact `2.0.0` production extension build and add matching captions before submission.
