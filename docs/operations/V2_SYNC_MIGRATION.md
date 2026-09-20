# V2 release migration: V3 sync phase

V1 remains released and completely local-first. The V3 synchronization phase
is part of the Navode `2.0.0` release line; it does not turn an existing local
installation into a cloud account automatically.

## User-controlled enrollment

```text
existing local data
  -> optional account sign-up or sign-in
  -> on-device preview of included and excluded data
  -> explicit START_INITIAL_SYNC confirmation
  -> first account-scoped synchronization
```

The preview includes aliases, preferences, quick links, projects, workspaces,
snippets, Today items, and integration connection metadata. It excludes
scratchpad content and recent-action history by default. A person may remain
local-only indefinitely, export a V1 JSON backup before enrollment, or cancel
before confirmation without uploading anything.

## Account deletion

Account deletion is performed through Better Auth's fresh-session/password
guard. Deleting the account cascades database-owned sessions, devices, sync
documents/revisions, cloud backups, credential records, and security events.
The API integration suite verifies this cascade. Browser-local settings remain
under the person's control: removing an account never erases their local copy.

## Operator checklist

1. Back up PostgreSQL and validate the restore procedure.
2. Apply reviewed migrations with the authorized direct `DATABASE_URL` runner.
3. Deploy the Worker using Hyperdrive and check `/health` and `/ready`.
4. Verify an opted-in account on two devices, a local-only installation, cloud
   backup restore confirmation, device revocation, and account deletion.
