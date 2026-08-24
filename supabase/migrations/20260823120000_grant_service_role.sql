-- Migration #0006 — grant service_role access to public tables
--
-- The migrations in this directory could not reproduce a working database from
-- scratch. Applying all of them to an empty project (`supabase start`, or a new
-- Supabase project + `db push`) produced tables that the server could not read:
--
--   {"code":"42501","message":"permission denied for table workspaces",
--    "hint":"Grant the required privileges to the current role with:
--            GRANT SELECT ON public.workspaces TO service_role;"}
--
-- Production never hit this because its tables predate the migration system
-- (see migrations/README.md — "the baseline applies harmlessly even though
-- production predates the migration system"). Those tables were created through
-- Supabase's own tooling, which grants to service_role as it goes. Tables
-- created by raw SQL in a migration inherit no such grant, so the gap only
-- appeared the first time anyone built the schema from these files alone.
--
-- Every statement is idempotent: re-granting a privilege that already exists is
-- a no-op, so this is safe against production, where the grants are already in
-- place and nothing changes.
--
-- Scope note: table privileges go to service_role only, not anon/authenticated.
-- That matches the design in 20260529130003_enable_rls.sql — RLS is deny-all for
-- those two roles because there is no Supabase-authenticated end user here; the
-- server holds the service-role key and is the only writer. Schema USAGE is
-- granted to all three because PostgREST needs it to introspect, and it conveys
-- no table access on its own.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Tables added by later migrations would otherwise land ungranted and
-- reintroduce the same 42501, so fix the default rather than only the present.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
