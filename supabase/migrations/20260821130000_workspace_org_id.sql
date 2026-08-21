-- Migration #0005 — add org_id to workspaces, for the shared-workspace migration
--
-- Every workspace today is scoped to a single Clerk user_id (see
-- lib/api-auth.js's verifyWorkspaceOwner) -- there is no table anywhere that
-- joins a second identity to someone else's workspace, so a workspace
-- literally cannot be shared by a team. This column is step 1 of fixing
-- that: workspaces.org_id will hold a Clerk Organization id, and workspace
-- access will move from "user_id equals the caller" to "the caller's active
-- org_id equals this org_id" once every existing workspace has been
-- backfilled with one.
--
-- This migration is intentionally inert on its own. org_id is nullable and
-- nothing in the app reads it yet -- verifyWorkspaceOwner still checks
-- user_id, so merging this changes no behavior for any existing user.
-- Do NOT flip verifyWorkspaceOwner to check org_id until:
--   1. Clerk Organizations is enabled for this app (dashboard-side, not
--      something a migration or this codebase can do), and
--   2. the backfill script has run against production, populating org_id
--      for every existing workspace.
-- Flipping the auth check before both of those are true would return false
-- for every workspace's owner and lock out every current user, since
-- migrations here auto-apply to production on merge (.github/workflows/migrate.yml)
-- but the auth-layer code change is a separate PR, not this migration.
--
-- Safe to run against the existing production database: every statement is
-- guarded with IF NOT EXISTS.

alter table public.workspaces add column if not exists org_id text;

-- verifyWorkspaceOwner will look this up on every workspace-scoped request
-- once it switches to org_id; keep that lookup cheap regardless of table size.
create index if not exists idx_workspaces_org on public.workspaces(org_id);
