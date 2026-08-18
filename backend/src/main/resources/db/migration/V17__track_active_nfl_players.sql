ALTER TABLE nfl_players
ADD COLUMN active BOOLEAN NOT NULL DEFAULT FALSE;

-- Force the first application start after this migration to refresh the seed.
UPDATE nfl_players
SET active = FALSE,
    updated_at = NULL;

CREATE INDEX idx_nfl_players_active_position
ON nfl_players (active, position);
