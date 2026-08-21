-- Migration #0004 — per-user daily AI call quota
--
-- Both AI routes (/api/analyze, /api/suggest-scores) bill the Anthropic API
-- per call and are gated on identity via lib/api-auth.js's withUser(), but
-- nothing has ever bounded volume — a single signed-in account could make
-- unlimited calls. ai_score_events and ai_analysis_events look like they'd
-- already serve this, but they don't: both are written CLIENT-SIDE, as a
-- secondary feedback-loop step after a successful response (see Form.jsx's
-- onScoreEvent / AIPanel.jsx's onAnalysisEvent), not server-side at the
-- moment of the actual Anthropic call. A client that never completes that
-- follow-up write — a bug, a modified client, or just not finishing the UI
-- flow — would show near-zero usage while making unlimited real calls.
-- Quota enforcement needs a record written server-side at call time, which
-- is what this table is for.
--
-- Safe to run against the existing production database: every statement is
-- guarded with IF NOT EXISTS.

create table if not exists public.ai_call_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  route text not null,
  created_at timestamptz not null default now()
);

-- withUser() counts rows for a user in the trailing 24h window on every
-- call; this index keeps that count cheap regardless of table size.
create index if not exists idx_ai_call_log_user_created
  on public.ai_call_log(user_id, created_at);

-- Deny-all for anon/authenticated; the server's service-role key bypasses
-- RLS. Same rationale as migrations/20260529130003_enable_rls.sql — there
-- is no Supabase-authenticated end user for an owner-scoped policy to match.
alter table public.ai_call_log enable row level security;
