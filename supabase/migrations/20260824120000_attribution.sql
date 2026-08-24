-- Migration #0007 — per-person attribution on revisions and decisions
--
-- VISION §8 Stage 2: "A record that cannot identify who supplied a given
-- estimate and who revised it does not support the review use case that
-- justifies the feature." Until the shared-workspace migration (#113–#115) a
-- workspace had exactly one member, so attribution had nothing to distinguish.
-- Now that more than one identity can act inside a workspace, it does.
--
-- Two columns per table rather than one, on purpose:
--
--   created_by       the Clerk user id. The real link — stable across renames,
--                    usable for filtering, and the thing that actually says
--                    WHO rather than what they were called.
--   created_by_name  a display name captured at write time.
--
-- The denormalized name looks redundant and is not. These tables are a
-- historical record meant to be read months later, and resolving ids to names
-- at read time makes that record depend on Clerk still being reachable AND on
-- the account still existing. Someone who leaves and has their account deleted
-- would silently become "Unknown" on a decision they actually made — the
-- record degrading precisely where its value is. Capturing the name at write
-- time freezes it, which is the correct behavior for a snapshot: it records
-- what was true when the decision was made, not what is true now.
--
-- The cost is one Clerk lookup per request that writes. Call sites resolve the
-- actor ONCE per request and pass it down, so a bulk sync writing N revisions
-- still makes one lookup, not N.
--
-- decisions.owner is untouched and stays free text. It answers a different
-- question — who is accountable for the outcome, which may be someone with no
-- account here at all — while created_by answers who entered this record.
-- Collapsing the two would lose the ability to credit a person who is not a
-- user.
--
-- Existing rows get NULL and render as unattributed, which is honest: nothing
-- in the data says who made those changes, and inventing an answer would be
-- worse than admitting the gap.
--
-- Every statement is guarded with IF NOT EXISTS and is safe to re-run.

alter table public.feature_revisions add column if not exists created_by text;
alter table public.feature_revisions add column if not exists created_by_name text;

alter table public.decisions add column if not exists created_by text;
alter table public.decisions add column if not exists created_by_name text;

-- "What has this person changed lately" is the query attribution exists to
-- answer; without this it degrades to a full scan as revisions accumulate.
create index if not exists idx_revisions_created_by
  on public.feature_revisions(created_by, created_at desc);
