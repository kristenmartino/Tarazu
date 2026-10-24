-- Reviews keep reported outcomes and new evidence separate from the decision.
-- Browser roles have no access; workspace authorization is enforced by Clerk
-- API routes. Service role can read/append but cannot rewrite review history.
create table if not exists public.decision_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  decision_id uuid not null references public.decisions(id) on delete cascade,
  action text not null check (action in ('keep', 'revise', 'retire')),
  outcome text not null check (char_length(btrim(outcome)) between 1 and 12000),
  new_evidence text not null default '' check (char_length(new_evidence) <= 12000),
  next_action text not null check (char_length(btrim(next_action)) between 1 and 12000),
  next_review_date date,
  evidence_snapshots jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_snapshots) = 'array'),
  decision_snapshot jsonb not null check (jsonb_typeof(decision_snapshot) = 'object'),
  reviewed_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_by_name text
);
create index if not exists idx_decision_reviews_workspace on public.decision_reviews(workspace_id, reviewed_at desc);
create index if not exists idx_decision_reviews_decision on public.decision_reviews(decision_id, reviewed_at desc);
alter table public.decision_reviews enable row level security;
revoke all on table public.decision_reviews from anon, authenticated, service_role;
grant select, insert on table public.decision_reviews to service_role;
