-- V11: Add performance indexes on foreign key columns and frequently queried columns
-- These indexes prevent full table scans as the dataset grows

-- ─── FRIEND GROUP MEMBERS ───────────────────────────────────────────────────
-- Composite PK (group_id, user_id) only covers group_id lookups.
-- Reverse lookups by user_id (e.g. "which groups is this user in?") need their own index.
CREATE INDEX idx_friend_group_members_user_id ON friend_group_members(user_id);

-- ─── PROP GROUPS ────────────────────────────────────────────────────────────
-- Composite PK (prop_id, group_id) only covers prop_id lookups.
-- Group-scoped queries ("all props for this group") need an index on group_id.
CREATE INDEX idx_prop_groups_group_id ON prop_groups(group_id);

-- ─── GROUP INVITES ──────────────────────────────────────────────────────────
-- FK columns queried by invite listing, duplicate-invite checks, and invite acceptance
CREATE INDEX idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX idx_group_invites_invitee_id ON group_invites(invitee_id);
CREATE INDEX idx_group_invites_inviter_id ON group_invites(inviter_id);

-- ─── FRIEND GROUPS ──────────────────────────────────────────────────────────
-- owner_id is a FK used in ownership checks
CREATE INDEX idx_friend_groups_owner_id ON friend_groups(owner_id);

-- ─── PROPS ──────────────────────────────────────────────────────────────────
-- created_by is a FK, queried when loading props with creator info
CREATE INDEX idx_props_created_by ON props(created_by);

-- ─── NFL PLAYERS ────────────────────────────────────────────────────────────
-- Position filtering on the master sheet and research queries
CREATE INDEX idx_nfl_players_position ON nfl_players(position);
