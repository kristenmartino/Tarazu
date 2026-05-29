# Database migrations

These migrations are the **source of truth** for the Tarazu database schema.
`../schema.sql` is kept as a human-readable snapshot of the full current schema
for reference, but it is generated/maintained by hand and should not be applied
directly to a database that has migrations.

## Bootstrapping a fresh database

```bash
supabase db reset          # local
# or, against a remote project:
supabase db push
```

This runs every migration in `supabase/migrations/` in timestamp order.

## Applying to the existing production database

The production database predates these migrations, so it already contains every
table defined in `20260529130001_baseline_schema.sql`. Running the baseline
against it would fail with "relation already exists".

Mark the baseline as already applied, then push the rest:

```bash
supabase migration repair --status applied 20260529130001
supabase db push
```

`supabase db push` will then apply only `20260529130002_*` (and any later
migrations), which are written to be idempotent.

## Adding a new migration

```bash
supabase migration new short_description
```

Edit the generated file, then update `../schema.sql` to match so the reference
snapshot stays accurate. Prefer idempotent statements (`if not exists`,
`create or replace`, `drop ... if exists`) so migrations are safe to re-run.
