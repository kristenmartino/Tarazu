-- Tarazu Database Schema — reference snapshot
--
-- This file mirrors the full current schema for easy reading. The authoritative
-- definitions live in supabase/migrations/ — see migrations/README.md. When you
-- add a migration, update this snapshot to match.

-- Workspaces table
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  org_id text, -- Clerk Organization id; nullable and unused until the
               -- shared-workspace auth-layer switch (see migrations/
               -- 20260821130000_workspace_org_id.sql)
  name text not null default 'My Backlog',
  position int not null default 0,
  product_summary text default '',
  target_users text default '',
  strategic_priorities text default '',
  constraints text default '',
  assumptions text default '',
  success_metrics text default '',
  scoring_settings jsonb not null default '{}'::jsonb,
  view_mode text not null default 'list',
  sort_mode text not null default 'rice',
  map_color_by text not null default 'tier',
  map_size_by text not null default 'uniform',
  map_label_mode text not null default 'hover',
  created_at timestamptz default now()
);

-- Features table
create table public.features (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text default '',
  scoring_basis jsonb not null default '{}'::jsonb,
  reach int not null default 50,
  impact int not null default 50,
  confidence int not null default 50,
  effort int not null default 50,
  owner text default null,
  theme text default null,
  status text default null,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_workspaces_user on public.workspaces(user_id);
create index idx_workspaces_org on public.workspaces(org_id);
create index idx_features_workspace on public.features(workspace_id);

-- Auto-stamp features.updated_at on every update
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_features_updated_at
  before update on public.features
  for each row
  execute function public.set_current_timestamp_updated_at();

-- ─── Agent Feedback Loop Tables ─────────────────────────────────────

-- Tracks AI score suggestions and whether users accepted/adjusted/rejected them
create table public.ai_score_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  feature_id text not null,
  feature_name text not null,
  dimension text not null check (dimension in ('reach', 'impact', 'confidence', 'effort')),
  ai_score int not null,
  final_score int,
  outcome text not null default 'pending' check (outcome in ('pending', 'accepted', 'adjusted', 'rejected')),
  created_at timestamptz default now()
);
create index idx_score_events_ws on public.ai_score_events(workspace_id);

-- Tracks AI analysis runs and user engagement signals
create table public.ai_analysis_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  feature_count int not null,
  mode text not null check (mode in ('live', 'demo')),
  response_ms int,
  top_pick text,
  quick_win text,
  risk_flag text,
  error boolean default false,
  thumbs_up boolean,
  created_at timestamptz default now()
);
create index idx_analysis_events_ws on public.ai_analysis_events(workspace_id);

-- ─── Feature Version Control ────────────────────────────────────────

-- Full snapshot per revision with field-level change tracking
create table public.feature_revisions (
  id uuid primary key default gen_random_uuid(),
  feature_id uuid not null references public.features(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  revision_number int not null,
  snapshot_name text not null,
  snapshot_description text not null default '',
  snapshot_reach int not null,
  snapshot_impact int not null,
  snapshot_confidence int not null,
  snapshot_effort int not null,
  snapshot_owner text,
  snapshot_theme text,
  snapshot_scoring_basis jsonb not null default '{}'::jsonb,
  snapshot_status text,
  change_type text not null default 'updated'
    check (change_type in ('created', 'updated', 'reverted')),
  changed_fields jsonb not null default '[]'::jsonb,
  change_summary text not null default '',
  reverted_to_revision int,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now()
);
create unique index idx_revisions_feature_number on public.feature_revisions(feature_id, revision_number);
create index idx_revisions_feature_created on public.feature_revisions(feature_id, created_at desc);
create index idx_revisions_workspace on public.feature_revisions(workspace_id);
create index idx_revisions_created_by on public.feature_revisions(created_by, created_at desc);

-- ─── Decisions ────────────────────────────────────────────────────────

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  chosen_candidate_id uuid references public.features(id) on delete set null,
  chosen_candidate_name text not null default '',
  summary_rationale text not null default '',
  final_rationale text not null default '',
  framework_used text not null default 'RICE',
  evidence_count int not null default 0,
  owner text default '',
  status text not null default 'draft',
  recommendation_snapshot jsonb not null default '{}'::jsonb,
  tradeoffs_considered text not null default '',
  risks_accepted text not null default '',
  expected_outcome text not null default '',
  decision_date timestamptz not null default now(),
  review_date timestamptz,
  position int not null default 0,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_decisions_workspace on public.decisions(workspace_id);

-- ─── Signals ──────────────────────────────────────────────────────────

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type text not null default 'note',
  title text not null,
  body text not null default '',
  source text not null default '',
  tags text[] not null default '{}',
  linked_candidate_id uuid references public.features(id) on delete set null,
  linked_candidate_name text not null default '',
  theme text not null default '',
  confidence_impact text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_signals_workspace on public.signals(workspace_id);

-- ─── Scenarios ────────────────────────────────────────────────────────

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text default '',
  weight_reach numeric(4,2) not null default 1.0,
  weight_impact numeric(4,2) not null default 1.0,
  weight_confidence numeric(4,2) not null default 1.0,
  weight_effort numeric(4,2) not null default 1.0,
  position int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_scenarios_workspace on public.scenarios(workspace_id);

-- ─── AI call quota ────────────────────────────────────────────────────
-- Server-side record of every billed AI call, written at call time by
-- lib/api-auth.js's withUser(). Not the same job as ai_score_events /
-- ai_analysis_events above, which are client-written feedback-loop
-- telemetry, not a reliable record of API usage.

create table public.ai_call_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  route text not null,
  created_at timestamptz not null default now()
);
create index idx_ai_call_log_user_created on public.ai_call_log(user_id, created_at);

-- ─── Row Level Security ─────────────────────────────────────────────────
-- Deny-all for anon/authenticated; the server's service-role key bypasses RLS.
-- See migrations/20260529130003_enable_rls.sql for the rationale.
alter table public.workspaces          enable row level security;
alter table public.features            enable row level security;
alter table public.ai_score_events     enable row level security;
alter table public.ai_analysis_events  enable row level security;
alter table public.feature_revisions   enable row level security;
alter table public.decisions           enable row level security;
alter table public.signals             enable row level security;
alter table public.scenarios           enable row level security;
alter table public.ai_call_log         enable row level security;

-- ─── Grants ─────────────────────────────────────────────────────────────
-- RLS above closes the door to anon/authenticated; these grants open it for
-- the server's service_role, which bypasses RLS and is the only writer.
-- Required for a database built from migrations alone: tables created by raw
-- SQL inherit no grant, so without this every request fails with 42501
-- "permission denied". Production predates the migration system and already
-- had these, which is why the gap only surfaced on a fresh local stack.
-- See migrations/20260823120000_grant_service_role.sql.
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

-- ─── Validation briefs ──────────────────────────────────────────────
-- First-class investigations, separate from approved decisions. JSON preserves
-- explicit unknowns and source snapshots even after a source is deleted.
create table public.validation_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  draft jsonb not null,
  revision int not null default 1 check (revision >= 1),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_validation_briefs_workspace
  on public.validation_briefs(workspace_id, updated_at desc);
alter table public.validation_briefs enable row level security;
-- Clerk authenticates at the server boundary; browser roles get no policy.
grant all on table public.validation_briefs to service_role;


-- Reserve before work, under one transaction lock across both AI routes.
-- Old successful-call history still contributes to the rolling budget.
create table if not exists public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  route text not null check (route in ('analyze', 'suggest-scores')),
  state text not null default 'reserved' check (state in ('reserved', 'completed', 'failed', 'rejected')),
  created_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz not null,
  finished_at timestamptz,
  response_status integer
);
create index if not exists idx_ai_reservations_created on public.ai_usage_reservations(created_at);
create index if not exists idx_ai_reservations_user_created on public.ai_usage_reservations(user_id, created_at);
create index if not exists idx_ai_reservations_active on public.ai_usage_reservations(lease_expires_at) where state = 'reserved';
create index if not exists idx_ai_call_log_created on public.ai_call_log(created_at);
alter table public.ai_usage_reservations enable row level security;
revoke all on public.ai_usage_reservations from anon, authenticated;
grant select, insert, update on public.ai_usage_reservations to service_role;

create or replace function public.reserve_ai_request(
  p_user_id text, p_route text, p_user_limit integer default 50,
  p_global_limit integer default 100, p_global_concurrency integer default 3,
  p_lease_seconds integer default 240, p_cooldown_seconds integer default 5
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_now timestamptz;
  v_user_count bigint;
  v_global_count bigint;
  v_active bigint;
  v_user_active bigint;
  v_last timestamptz;
  v_first timestamptz;
  v_first_global timestamptz;
  v_next_lease timestamptz;
  v_id uuid;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or length(p_user_id) > 255
    or p_route is null or p_route not in ('analyze', 'suggest-scores')
    or p_user_limit is null or p_user_limit not between 1 and 1000
    or p_global_limit is null or p_global_limit not between 1 and 100000
    or p_global_concurrency is null or p_global_concurrency not between 1 and 32
    or p_lease_seconds is null or p_lease_seconds not between 180 and 600
    or p_cooldown_seconds is null or p_cooldown_seconds not between 0 and 60 then
    raise exception 'Invalid AI usage configuration' using errcode = '22023';
  end if;

  -- Transaction-scoped: automatically released on success or rollback. No
  -- network/provider work is performed while this lock is held.
  perform pg_catalog.pg_advisory_xact_lock(13745, 1);
  v_now := clock_timestamp();
  select count(*), count(*) filter (where user_id = p_user_id),
    min(created_at), min(created_at) filter (where user_id = p_user_id),
    max(created_at) filter (where user_id = p_user_id)
  into v_global_count, v_user_count, v_first_global, v_first, v_last
  from (
    select user_id, created_at from public.ai_usage_reservations
      where created_at > v_now - interval '24 hours' and state <> 'rejected'
    union all
    select user_id, created_at from public.ai_call_log where created_at > v_now - interval '24 hours'
  ) usage;

  if v_user_count >= p_user_limit then
    return jsonb_build_object('allowed', false, 'reason', 'quota_exceeded', 'retry_after', greatest(1, ceil(extract(epoch from v_first + interval '24 hours' - v_now)))::integer);
  end if;
  if v_global_count >= p_global_limit then
    return jsonb_build_object('allowed', false, 'reason', 'global_quota_exceeded', 'retry_after', greatest(1, ceil(extract(epoch from v_first_global + interval '24 hours' - v_now)))::integer);
  end if;

  select count(*), count(*) filter (where user_id = p_user_id), min(lease_expires_at)
  into v_active, v_user_active, v_next_lease
  from public.ai_usage_reservations where state = 'reserved' and lease_expires_at > v_now;
  if v_user_active > 0 then
    return jsonb_build_object('allowed', false, 'reason', 'request_in_progress', 'retry_after', 5);
  end if;
  if v_active >= p_global_concurrency then
    return jsonb_build_object('allowed', false, 'reason', 'ai_busy', 'retry_after', greatest(1, least(30, ceil(extract(epoch from v_next_lease - v_now))))::integer);
  end if;
  if v_last is not null and v_last + make_interval(secs => p_cooldown_seconds) > v_now then
    return jsonb_build_object('allowed', false, 'reason', 'request_too_soon', 'retry_after', greatest(1, ceil(extract(epoch from v_last + make_interval(secs => p_cooldown_seconds) - v_now)))::integer);
  end if;

  insert into public.ai_usage_reservations(user_id, route, created_at, lease_expires_at)
  values(p_user_id, p_route, v_now, v_now + make_interval(secs => p_lease_seconds)) returning id into v_id;
  return jsonb_build_object('allowed', true, 'reservation_id', v_id,
    'user_used', v_user_count + 1, 'global_used', v_global_count + 1);
end;
$$;

create or replace function public.finish_ai_request(p_reservation_id uuid, p_status integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status is null or p_status not between 100 and 599 then
    raise exception 'Invalid AI response status' using errcode = '22023';
  end if;
  -- Only validation failures before provider work release the daily budget.
  -- Timeouts, malformed provider responses and upstream errors still count.
  update public.ai_usage_reservations
    set state = case when p_status in (400, 413, 422) then 'rejected'
      when p_status < 400 then 'completed' else 'failed' end,
      response_status = p_status, finished_at = clock_timestamp()
    where id = p_reservation_id and state = 'reserved';
end;
$$;

revoke all on function public.reserve_ai_request(text, text, integer, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.finish_ai_request(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(text, text, integer, integer, integer, integer, integer) to service_role;
grant execute on function public.finish_ai_request(uuid, integer) to service_role;

notify pgrst, 'reload schema';
