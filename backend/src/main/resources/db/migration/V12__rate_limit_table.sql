-- V12: Database-backed rate limiting for research queries
-- Replaces in-memory ConcurrentHashMap that resets on restart and doesn't work across instances

CREATE TABLE rate_limit_log (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(50)  NOT NULL,
    endpoint    VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_log_username_endpoint ON rate_limit_log(username, endpoint, created_at);
