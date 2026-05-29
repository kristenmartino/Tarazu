-- Migration #0003 — enable Row Level Security (defense-in-depth) — GitHub #20
--
-- Architecture context: Tarazu authenticates with Clerk (not Supabase Auth)
-- and all database access happens server-side in API routes using the Supabase
-- SERVICE ROLE key. The service role bypasses RLS, and every route already
-- enforces per-user ownership via verifyWorkspaceOwner().
--
-- There are therefore no Supabase-authenticated end users for auth.uid()-style
-- policies to match. The meaningful hardening here is to enable RLS on every
-- table so the anon / authenticated / public roles get DENY-ALL by default:
-- if the anon (publishable) key were ever exposed or used client-side, it would
-- expose zero rows. Server routes are unaffected (service role bypasses RLS).
--
-- If the app later adopts Supabase Auth or exposes the anon key to the browser,
-- add owner-scoped policies (e.g. using auth.jwt()->>'sub') in a new migration.
--
-- `enable row level security` is idempotent — safe to re-run.

alter table public.workspaces          enable row level security;
alter table public.features            enable row level security;
alter table public.ai_score_events     enable row level security;
alter table public.ai_analysis_events  enable row level security;
alter table public.feature_revisions   enable row level security;
alter table public.decisions           enable row level security;
alter table public.signals             enable row level security;
alter table public.scenarios           enable row level security;
