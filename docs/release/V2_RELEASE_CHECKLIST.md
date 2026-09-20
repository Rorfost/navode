# Navode 2.0.0 release checklist

## Automated gate

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:e2e`
- [ ] `pnpm build:web`
- [ ] `pnpm build:extension`

## Integration and privacy audit

- [ ] Confirm Google Calendar requests only `calendar.events.readonly` through Chrome identity.
- [ ] Confirm no GitHub, Calendar, or Codeforces credential is persisted in Navode settings or logged.
- [ ] Confirm disconnect removes that provider cache and stops its background refresh; Calendar also removes its cached auth token.
- [ ] Confirm each live widget is opt-in and visibly handles disconnected, loading, cached, stale, empty, and error states.
- [ ] Confirm project-health requests use configured http(s) URLs only and do not use a Navode proxy.
- [ ] Confirm provider requests are delayed until after local settings render and cached data remains usable offline.

## Manual Chrome and store gate

- [ ] Load the production extension in a clean profile and verify optional permission prompts occur only after a user connects a provider or saves a health URL.
- [ ] Capture final production screenshots showing connected widgets and their disconnected/error states; update `store-assets/CAPTIONS.md`.
- [ ] Update Chrome Web Store listing, privacy answers, and permission justifications from `docs/release/CHROME_WEB_STORE.md`.
- [ ] Package the exact release candidate, verify its checksum, and complete `MANUAL_SUBMISSION.md` before tag or submission.
