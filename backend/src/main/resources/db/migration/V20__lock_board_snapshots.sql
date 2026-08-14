ALTER TABLE board_snapshots
    ADD COLUMN locked_at TIMESTAMPTZ;

CREATE INDEX idx_board_snapshots_locked_at
    ON board_snapshots (locked_at)
    WHERE locked_at IS NOT NULL;
