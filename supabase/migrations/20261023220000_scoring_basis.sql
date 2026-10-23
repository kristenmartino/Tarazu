-- Additive: older clients keep working and existing scores are not recalculated.
alter table public.workspaces add column if not exists scoring_settings jsonb not null default '{}'::jsonb;
alter table public.features add column if not exists scoring_basis jsonb not null default '{}'::jsonb;
alter table public.feature_revisions add column if not exists snapshot_scoring_basis jsonb not null default '{}'::jsonb;
