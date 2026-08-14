ALTER TABLE snapshot_entries
ADD CONSTRAINT uq_snapshot_entry_rank UNIQUE (snapshot_id, user_rank);
