-- Fantasy Seers - Initial Schema
-- V1: Users, Props, Votes, Friend Groups, Badges

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    point_bank  INTEGER      NOT NULL DEFAULT 1000,
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',  -- USER | ADMIN
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ─── FRIEND GROUPS ────────────────────────────────────────────────────────────

CREATE TABLE friend_groups (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    invite_code VARCHAR(20)  NOT NULL UNIQUE,
    owner_id    BIGINT       NOT NULL REFERENCES users(id),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE friend_group_members (
    group_id    BIGINT NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);

-- ─── FOLLOWS ──────────────────────────────────────────────────────────────────

CREATE TABLE follows (
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
);

-- ─── PROPS ────────────────────────────────────────────────────────────────────

CREATE TABLE props (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    sport           VARCHAR(20)  NOT NULL,   -- NFL | NBA
    game_id         VARCHAR(100),            -- ESPN game ID for auto-resolution
    stat_key        VARCHAR(100),            -- e.g. "rushing_yards", "points"
    stat_threshold  DECIMAL(8,2),            -- e.g. 55.0
    stat_direction  VARCHAR(10),             -- OVER | UNDER (for threshold props)
    created_by      BIGINT       NOT NULL REFERENCES users(id),
    is_admin_prop   BOOLEAN      NOT NULL DEFAULT FALSE,
    scope           VARCHAR(20)  NOT NULL DEFAULT 'GROUP', -- GROUP | PUBLIC
    status          VARCHAR(20)  NOT NULL DEFAULT 'OPEN',  -- OPEN | CLOSED | RESOLVED | PENDING
    result          VARCHAR(10),                           -- YES | NO | null
    closes_at       TIMESTAMP    NOT NULL,
    resolved_at     TIMESTAMP,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Props visible to a specific group
CREATE TABLE prop_groups (
    prop_id     BIGINT NOT NULL REFERENCES props(id) ON DELETE CASCADE,
    group_id    BIGINT NOT NULL REFERENCES friend_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (prop_id, group_id)
);

-- Admin approval queue for user-submitted public props
CREATE TABLE prop_submissions (
    id          BIGSERIAL PRIMARY KEY,
    prop_id     BIGINT NOT NULL REFERENCES props(id) ON DELETE CASCADE,
    submitted_by BIGINT NOT NULL REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | APPROVED | REJECTED
    reviewed_by BIGINT REFERENCES users(id),
    review_note TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at  TIMESTAMP
);

-- ─── VOTES ────────────────────────────────────────────────────────────────────

CREATE TABLE votes (
    id           BIGSERIAL PRIMARY KEY,
    prop_id      BIGINT      NOT NULL REFERENCES props(id),
    user_id      BIGINT      NOT NULL REFERENCES users(id),
    choice       VARCHAR(5)  NOT NULL,  -- YES | NO
    wager_amount INTEGER     NOT NULL CHECK (wager_amount > 0),
    payout       INTEGER,               -- null until resolved
    created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (prop_id, user_id)           -- one vote per prop per user
);

-- ─── POINT LEDGER ─────────────────────────────────────────────────────────────

CREATE TABLE point_transactions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id),
    amount      INTEGER     NOT NULL,   -- positive = credit, negative = debit
    type        VARCHAR(30) NOT NULL,   -- WAGER | PAYOUT | BONUS | STARTING_BALANCE
    reference_id BIGINT,               -- vote_id or other ref
    note        TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ─── BADGES ───────────────────────────────────────────────────────────────────

CREATE TABLE badges (
    id          BIGSERIAL PRIMARY KEY,
    key         VARCHAR(50)  NOT NULL UNIQUE,  -- e.g. 'sharp_shooter'
    name        VARCHAR(100) NOT NULL,
    description TEXT         NOT NULL,
    icon        VARCHAR(50)  NOT NULL           -- emoji or icon key
);

CREATE TABLE user_badges (
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    BIGINT NOT NULL REFERENCES badges(id),
    earned_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

INSERT INTO badges (key, name, description, icon) VALUES
    ('sharp_shooter',   'Sharp Shooter',  'Got your first 10 correct picks',                          '🎯'),
    ('contrarian',      'Contrarian',     'Won 5 props where you were in the minority vote',           '🦄'),
    ('hot_hand',        'Hot Hand',       'Correct pick streak of 5',                                  '🔥'),
    ('ice_cold',        'Ice Cold',       'Correct pick streak of 10+',                                '🧊'),
    ('whale',           'Whale',          'Wagered 500+ points on a single prop and won',              '🐋'),
    ('prop_creator',    'Prop Creator',   'Had a user-created prop approved for public distribution',  '✍️'),
    ('season_mvp',      'Season MVP',     'Finished top 3 in a friend group leaderboard for a season', '🏆');

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_props_status      ON props(status);
CREATE INDEX idx_props_sport       ON props(sport);
CREATE INDEX idx_props_closes_at   ON props(closes_at);
CREATE INDEX idx_votes_prop_id     ON votes(prop_id);
CREATE INDEX idx_votes_user_id     ON votes(user_id);
CREATE INDEX idx_transactions_user ON point_transactions(user_id);
