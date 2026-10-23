-- First-class investigations, separate from approved decisions. JSON preserves
-- explicit unknowns and source snapshots even after a source is deleted.
create table if not exists public.validation_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  draft jsonb not null,
  revision int not null default 1 check (revision >= 1),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_validation_briefs_workspace
  on public.validation_briefs(workspace_id, updated_at desc);
alter table public.validation_briefs enable row level security;
-- Clerk authenticates at the server boundary; browser roles get no policy.
grant all on table public.validation_briefs to service_role;
