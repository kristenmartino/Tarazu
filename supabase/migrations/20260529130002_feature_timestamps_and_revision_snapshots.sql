-- Migration #0002 — feature timestamps + revision snapshot completeness
--
-- Fixes two data-model gaps (GitHub #19, #21):
--   1. features had no updated_at, so the UI's recency display always read
--      undefined. Adds updated_at + an auto-update trigger.
--   2. feature_revisions only snapshotted name/description/reach/impact/
--      confidence/effort, but the feature route tracks owner/theme/status as
--      changed fields. Those changes showed up in history but could not be
--      reverted. Adds snapshot columns for owner/theme/status.
--
-- Safe to run against the existing production database: every statement is
-- guarded with IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS.

-- ─── 1. features.updated_at + auto-update trigger ───────────────────────

alter table public.features
  add column if not exists updated_at timestamptz not null default now();

-- Reusable trigger function that stamps updated_at on every UPDATE.
create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_features_updated_at on public.features;
create trigger set_features_updated_at
  before update on public.features
  for each row
  execute function public.set_current_timestamp_updated_at();

-- ─── 2. feature_revisions snapshot completeness ─────────────────────────

alter table public.feature_revisions
  add column if not exists snapshot_owner text,
  add column if not exists snapshot_theme text,
  add column if not exists snapshot_status text;

-- Note: revisions created before this migration have NULL for these columns.
-- Reverting to such a revision restores owner/theme/status to NULL, which is
-- the honest reflection of what was captured at that point in time.
