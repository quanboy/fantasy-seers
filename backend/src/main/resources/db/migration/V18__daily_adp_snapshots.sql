CREATE TABLE adp_snapshots (
    id          BIGSERIAL   PRIMARY KEY,
    player_id   BIGINT      NOT NULL REFERENCES nfl_players(id) ON DELETE CASCADE,
    source      VARCHAR(30) NOT NULL,
    captured_at TIMESTAMP   NOT NULL,
    value       INTEGER     NOT NULL,
    UNIQUE (player_id, source, captured_at)
);

CREATE INDEX idx_adp_snapshots_player_captured
ON adp_snapshots (player_id, captured_at DESC);

CREATE INDEX idx_adp_snapshots_source_captured
ON adp_snapshots (source, captured_at DESC);
