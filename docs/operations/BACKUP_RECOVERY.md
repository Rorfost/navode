# Backup and recovery

The V1 recovery path is local export. Users should export configuration before risky upgrades or browser-profile changes and keep exports in a location they control.

To restore, validate the export file, review the import summary, and import only after confirming it will not overwrite needed local configuration. For corrupted state or migration failure, preserve an export when possible; reset local Navode storage only after that. There is no database backup or cloud-sync recovery process yet. Any future sync design must specify conflict handling, retention, and recovery before release.
