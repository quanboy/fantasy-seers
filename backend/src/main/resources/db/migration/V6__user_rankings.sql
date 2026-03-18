CREATE TABLE user_rankings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id BIGINT NOT NULL REFERENCES nfl_players(id) ON DELETE CASCADE,
    overall_rank INT NOT NULL,
    positional_rank INT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, player_id)
);
CREATE INDEX idx_user_rankings_user_id ON user_rankings(user_id);
