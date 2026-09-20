# Backup and recovery

The V1 recovery path is local export. Users should export configuration before risky upgrades or browser-profile changes and keep exports in a location they control.

To restore on another installation, open Settings, choose a backup JSON file, review the replacement preview, and confirm the import. Invalid JSON, unsafe URLs, unsupported versions, and malformed records show validation errors without changing existing settings.

For a corrupted state or migration failure, first export if the settings page is still usable. Then reset an individual section (layout, quick links, timer, or recent actions) where appropriate; use **Reset all Navode data** only after its confirmation. A full reset returns to safe local defaults and restarts onboarding.

V3.5 adds optional account-scoped cloud snapshots. They are immutable and listed
without their contents. A restore requires the exact confirmation
`REPLACE_LOCAL_DATA`; only then does the API return the selected snapshot to the
client. The client must offer the existing local JSON export before replacing
local data and must never perform that replacement automatically. Cloud backup
does not replace user-controlled JSON export/import. Backups currently remain
until account-data deletion; no undocumented automatic expiry is implied.
