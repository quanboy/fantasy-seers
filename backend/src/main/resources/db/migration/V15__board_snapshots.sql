-- Board snapshots: snapshot-based ranking boards with season/type support

-- User preferences for scoring format
ALTER TABLE users ADD COLUMN scoring_format VARCHAR(20);
ALTER TABLE users ADD COLUMN primary_format VARCHAR(20);
ALTER TABLE users ADD COLUMN superflex BOOLEAN NOT NULL DEFAULT FALSE;

-- Group capacity
ALTER TABLE friend_groups ADD COLUMN max_members INTEGER;

-- Board snapshots
CREATE TABLE board_snapshots (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(id),
    season          INTEGER      NOT NULL,
    snapshot_type   VARCHAR(20)  NOT NULL DEFAULT 'PRESEASON',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (user_id, season, snapshot_type)
);

CREATE INDEX idx_board_snapshots_user_id ON board_snapshots(user_id);

-- Snapshot entries
CREATE TABLE snapshot_entries (
    id              BIGSERIAL    PRIMARY KEY,
    snapshot_id     BIGINT       NOT NULL REFERENCES board_snapshots(id) ON DELETE CASCADE,
    player_id       BIGINT       NOT NULL REFERENCES nfl_players(id),
    user_rank       INTEGER      NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (snapshot_id, player_id)
);

CREATE INDEX idx_snapshot_entries_snapshot_id ON snapshot_entries(snapshot_id);
