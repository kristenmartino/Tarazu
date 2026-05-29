-- Baseline schema for Tarazu (migration #0001)
--
-- This captures the schema as it existed before migrations were introduced.
-- It is the canonical starting point for bootstrapping a fresh database.
--
-- IMPORTANT for the existing production database (which already has these
-- tables): do NOT run this migration against it. Mark it as already applied:
--     supabase migration repair --status applied 20260529130001
-- then apply only later migrations. See migrations/README.md.

-- Workspaces table
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null default 'My Backlog',
  position int not null default 0,
  product_summary text default '',
  target_users text default '',
  strategic_priorities text default '',
  constraints text default '',
  assumptions text default '',
  success_metrics text default '',
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
  reach int not null default 50,
  impact int not null default 50,
  confidence int not null default 50,
  effort int not null default 50,
  owner text default null,
  theme text default null,
  status text default null,
  position int not null default 0,
  created_at timestamptz default now()
);

-- Indexes
create index idx_workspaces_user on public.workspaces(user_id);
create index idx_features_workspace on public.features(workspace_id);

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
  change_type text not null default 'updated'
    check (change_type in ('created', 'updated', 'reverted')),
  changed_fields jsonb not null default '[]'::jsonb,
  change_summary text not null default '',
  reverted_to_revision int,
  created_at timestamptz not null default now()
);
create unique index idx_revisions_feature_number on public.feature_revisions(feature_id, revision_number);
create index idx_revisions_feature_created on public.feature_revisions(feature_id, created_at desc);
create index idx_revisions_workspace on public.feature_revisions(workspace_id);

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
