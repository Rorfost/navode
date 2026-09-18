# Backup and recovery

The V1 recovery path is local export. Users should export configuration before risky upgrades or browser-profile changes and keep exports in a location they control.

To restore on another installation, open Settings, choose a backup JSON file, review the replacement preview, and confirm the import. Invalid JSON, unsafe URLs, unsupported versions, and malformed records show validation errors without changing existing settings.

For a corrupted state or migration failure, first export if the settings page is still usable. Then reset an individual section (layout, quick links, timer, or recent actions) where appropriate; use **Reset all Navode data** only after its confirmation. A full reset returns to safe local defaults and restarts onboarding. There is no database backup or cloud-sync recovery process yet. Any future sync design must specify conflict handling, retention, and recovery before release.
