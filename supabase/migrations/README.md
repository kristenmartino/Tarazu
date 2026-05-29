# Database migrations

These migrations are the **source of truth** for the Tarazu database schema.
`../schema.sql` is a human-readable snapshot of the full current schema for
reference; it's maintained by hand and is not applied directly.

## Migrations apply automatically 🤖

Merging a migration file to `main` triggers `.github/workflows/migrate.yml`,
which runs `supabase db push` against production. **You don't apply migrations
by hand** — just add the file and merge.

Every migration is written to be **idempotent** (`if not exists`,
`create or replace`, `drop ... if exists`), so a push is always safe to re-run,
and the baseline applies harmlessly even though production predates the
migration system.

### One-time setup

Add two GitHub Actions secrets (repo → Settings → Secrets and variables →
Actions):

| Secret | Where to get it |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | https://supabase.com/dashboard/account/tokens |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database (reset if unknown) |

The project ref (`lyrnkwqxxsjqjcjggies`) is hardcoded in the workflow — it's not
secret. After the secrets exist, trigger the first run from the **Actions** tab
(**Migrate DB → Run workflow**) or by merging any migration change.

## Adding a new migration

```bash
supabase migration new short_description
```

Edit the generated file (keep statements idempotent), update `../schema.sql` to
match, and open a PR. On merge, CI applies it.

## Manual application (fallback)

If you ever need to apply by hand (CI down, local dev):

```bash
supabase link --project-ref lyrnkwqxxsjqjcjggies
supabase db push
```

Because the statements are idempotent, this is safe even if some migrations are
already applied.
