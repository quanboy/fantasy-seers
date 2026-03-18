-- Read-only Postgres role for AI-generated SQL queries.
-- Password is overridden by READONLY_DB_PASSWORD env var in production.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fs_readonly') THEN
        CREATE ROLE fs_readonly WITH LOGIN PASSWORD 'readonly_local_dev';
    END IF;
END
$$;

GRANT CONNECT ON DATABASE fantasyseers_db TO fs_readonly;
GRANT USAGE ON SCHEMA public TO fs_readonly;

-- Safe view of users (excludes password, email)
CREATE OR REPLACE VIEW users_safe AS
    SELECT id, username, point_bank, role, favorite_nfl_team,
           favorite_nba_team, alma_mater, created_at
    FROM users;

-- Grant SELECT on safe tables only
GRANT SELECT ON
    users_safe,
    props,
    votes,
    friend_groups,
    friend_group_members,
    prop_groups,
    point_transactions,
    badges,
    user_badges,
    nfl_players,
    user_rankings,
    consensus_rankings
TO fs_readonly;
