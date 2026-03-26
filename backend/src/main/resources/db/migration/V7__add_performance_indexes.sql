-- Indexes for commonly queried columns
CREATE INDEX IF NOT EXISTS idx_props_status ON props(status);
CREATE INDEX IF NOT EXISTS idx_props_closes_at ON props(closes_at);
CREATE INDEX IF NOT EXISTS idx_props_created_by ON props(created_by);
CREATE INDEX IF NOT EXISTS idx_friend_groups_owner ON friend_groups(owner_id);
