# PostgreSQL migration operations

## Source of truth

`apps/api/src/db/schema.ts` is the typed model and `apps/api/migrations/` is the
reviewed SQL history. Neither production operators nor application code may
hand-edit a deployed schema. Use `pnpm --filter @navode/api db:generate` to
prepare a migration, review its SQL, commit it with the schema change, then run
`pnpm --filter @navode/api db:check` in CI.

Some Windows development runtimes report `uv_os_get_passwd ENOMEM` from Node's
`os.userInfo()`, which Drizzle Kit calls while starting. The API's Drizzle script
uses a narrow local fallback only for that known Node system error; normal
environments retain Node's value. The initial reviewed SQL is also exercised
against PGlite by the API integration test. Do not use `drizzle-kit push` as a
workaround.

## Applying a migration

1. Take or verify a restorable PostgreSQL backup and review the target migration.
2. From an authorized CI job or operator workstation, set the direct,
   non-Hyperdrive `DATABASE_URL` only for the migration process.
3. Run `pnpm --filter @navode/api db:migrate` before deploying the Worker.
4. Deploy the Worker with its Hyperdrive binding, then check `/health` and
   `/ready`. `/ready` must query PostgreSQL successfully.

The deployed Worker never receives `DATABASE_URL`; Hyperdrive owns its database
connection string. The migration role may alter schema only. Runtime roles get
only the application operations required after V3.3's API endpoints exist.

## Recovery

Migrations are forward-only by default. Every migration review must state
whether a rollback is safe; destructive changes require an expand/backfill/
contract sequence and a tested restore path. If a migration fails, halt the
rollout, restore or apply a reviewed forward fix, and record the incident. Do
not repair production schema manually.
