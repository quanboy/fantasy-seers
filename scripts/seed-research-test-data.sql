-- Seed data for testing the research endpoint with fan bias queries.
-- Run: docker exec -i fantasy-seers-db psql -U fantasyseers -d fantasyseers_db < scripts/seed-research-test-data.sql

-- 1. Assign favorite NFL teams to users
UPDATE users SET favorite_nfl_team = 'PHI' WHERE username IN ('vquan24', 'vquan');
UPDATE users SET favorite_nfl_team = 'DAL' WHERE username IN ('beta_alice', 'beta_bob');
UPDATE users SET favorite_nfl_team = 'MIA' WHERE username IN ('seed_bob', 'seed_charlie');
UPDATE users SET favorite_nfl_team = 'PHI' WHERE username IN ('fix_alice', 'fix_bob');
UPDATE users SET favorite_nfl_team = 'DAL' WHERE username IN ('seed_alice', 'seed_diana');
UPDATE users SET favorite_nfl_team = 'MIA' WHERE username IN ('beta_carol', 'fix_carol');

-- 2. Clear any existing user rankings for these users
DELETE FROM user_rankings WHERE user_id IN (
    SELECT id FROM users WHERE username IN (
        'vquan24','vquan','beta_alice','beta_bob','seed_bob','seed_charlie',
        'fix_alice','fix_bob','seed_alice','fix_carol','beta_carol'
    )
);

-- 3. Helper: Insert rankings for a user based on consensus but with specific overrides.
--    We copy all 300 consensus rankings, then shift specific players up or down.

-- Function to seed one user's rankings from consensus with homer bias
CREATE OR REPLACE FUNCTION seed_biased_rankings(
    p_user_id BIGINT,
    p_team VARCHAR(10),
    p_boost INT  -- how many ranks to boost own-team players (negative = higher rank)
) RETURNS VOID AS $$
DECLARE
    rec RECORD;
    pos_counters JSONB := '{}';
    new_rank INT := 0;
    pos_rank INT;
    cur_count INT;
BEGIN
    -- Build reordered rankings: own-team players get boosted
    FOR rec IN
        SELECT cr.player_id, np.position, np.nfl_team,
               cr.overall_rank + CASE WHEN np.nfl_team = p_team THEN p_boost ELSE 0 END AS adjusted_rank
        FROM consensus_rankings cr
        JOIN nfl_players np ON np.id = cr.player_id
        ORDER BY cr.overall_rank + CASE WHEN np.nfl_team = p_team THEN p_boost ELSE 0 END ASC
    LOOP
        new_rank := new_rank + 1;

        -- Calculate positional rank
        cur_count := COALESCE((pos_counters->>rec.position)::INT, 0) + 1;
        pos_counters := pos_counters || jsonb_build_object(rec.position, cur_count);

        INSERT INTO user_rankings (user_id, player_id, overall_rank, positional_rank, updated_at)
        VALUES (p_user_id, rec.player_id, new_rank, cur_count, NOW());
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Seed rankings for Eagles fans (boost PHI players by -20 ranks = overrate)
SELECT seed_biased_rankings(id, 'PHI', -20) FROM users WHERE username = 'vquan24';
SELECT seed_biased_rankings(id, 'PHI', -15) FROM users WHERE username = 'vquan';
SELECT seed_biased_rankings(id, 'PHI', -25) FROM users WHERE username = 'fix_alice';
SELECT seed_biased_rankings(id, 'PHI', -10) FROM users WHERE username = 'fix_bob';

-- 5. Seed rankings for Cowboys fans (boost DAL players by -18 ranks)
SELECT seed_biased_rankings(id, 'DAL', -18) FROM users WHERE username = 'beta_alice';
SELECT seed_biased_rankings(id, 'DAL', -22) FROM users WHERE username = 'beta_bob';
SELECT seed_biased_rankings(id, 'DAL', -12) FROM users WHERE username = 'seed_alice';

-- 6. Seed rankings for Dolphins fans (boost MIA players by -15 ranks)
SELECT seed_biased_rankings(id, 'MIA', -15) FROM users WHERE username = 'seed_bob';
SELECT seed_biased_rankings(id, 'MIA', -20) FROM users WHERE username = 'seed_charlie';
SELECT seed_biased_rankings(id, 'MIA', -10) FROM users WHERE username = 'beta_carol';
SELECT seed_biased_rankings(id, 'MIA', -18) FROM users WHERE username = 'fix_carol';

-- 7. Cleanup
DROP FUNCTION seed_biased_rankings;

-- 8. Verify
SELECT u.favorite_nfl_team AS team, COUNT(DISTINCT u.id) AS fans, COUNT(ur.id) AS total_rankings
FROM users u
JOIN user_rankings ur ON ur.user_id = u.id
WHERE u.favorite_nfl_team IS NOT NULL
GROUP BY u.favorite_nfl_team
ORDER BY team;
