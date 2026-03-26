const fs = require('fs');
const path = require('path');

const SLEEPER_API = 'https://api.sleeper.app/v1/players/nfl';
const VALID_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const TOP_N = 300;

const MIGRATION_DIR = path.join(__dirname, '..', 'backend', 'src', 'main', 'resources', 'db', 'migration');

async function main() {
  console.log('Fetching NFL players from Sleeper API...');
  const res = await fetch(SLEEPER_API);
  if (!res.ok) throw new Error(`Sleeper API returned ${res.status}`);
  const playersMap = await res.json();

  console.log(`Received ${Object.keys(playersMap).length} total player entries`);

  // Filter to relevant positions with Active status or non-null search_rank
  const players = Object.entries(playersMap)
    .map(([id, p]) => ({ sleeperId: id, ...p }))
    .filter(p => {
      if (!VALID_POSITIONS.includes(p.position)) return false;
      // DEF entries use active:true instead of status:"Active"
      if (p.position === 'DEF') return p.active === true;
      if (p.status === 'Active') return true;
      if (p.search_rank != null) return true;
      return false;
    });

  console.log(`Filtered to ${players.length} players in positions: ${VALID_POSITIONS.join(', ')}`);

  // DEF teams have no search_rank — assign a default that places them mid-tier
  for (const p of players) {
    if (p.position === 'DEF' && p.search_rank == null) {
      p.search_rank = 200;
    }
  }

  // Sort by search_rank ascending (nulls last), then alphabetically
  players.sort((a, b) => {
    const rankA = a.search_rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.search_rank ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    const nameA = (a.full_name || a.last_name || '').toLowerCase();
    const nameB = (b.full_name || b.last_name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Take top 300
  const top = players.slice(0, TOP_N);
  console.log(`Selected top ${top.length} players`);

  // Compute positional ranks
  const positionCounters = {};
  for (const p of top) {
    const pos = p.position;
    positionCounters[pos] = (positionCounters[pos] || 0) + 1;
    p._positionalRank = positionCounters[pos];
  }

  // Log position breakdown
  console.log('Position breakdown:');
  for (const [pos, count] of Object.entries(positionCounters).sort()) {
    console.log(`  ${pos}: ${count}`);
  }

  // Escape single quotes for SQL
  const esc = (s) => (s || '').replace(/'/g, "''");

  // Generate V5__nfl_players.sql
  let v5 = `CREATE TABLE nfl_players (
    id BIGSERIAL PRIMARY KEY,
    sleeper_id VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    position VARCHAR(10) NOT NULL,
    nfl_team VARCHAR(10),
    status VARCHAR(30),
    updated_at TIMESTAMP DEFAULT NOW()
);\n\n`;

  for (const p of top) {
    const fullName = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
    const team = p.team || null;
    const status = p.status || (p.active ? 'Active' : null);
    const teamVal = team ? `'${esc(team)}'` : 'NULL';
    const statusVal = status ? `'${esc(status)}'` : 'NULL';
    v5 += `INSERT INTO nfl_players (sleeper_id, full_name, position, nfl_team, status) VALUES ('${esc(p.sleeperId)}', '${esc(fullName)}', '${esc(p.position)}', ${teamVal}, ${statusVal});\n`;
  }

  // Generate V7__consensus_rankings.sql
  let v7 = `CREATE TABLE consensus_rankings (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES nfl_players(id) ON DELETE CASCADE UNIQUE,
    overall_rank INT NOT NULL,
    positional_rank INT NOT NULL
);\n\n`;

  for (let i = 0; i < top.length; i++) {
    const p = top[i];
    const overallRank = i + 1;
    const fullName = p.full_name || p.last_name || 'Unknown';
    // Use subquery to look up player_id by sleeper_id
    v7 += `INSERT INTO consensus_rankings (player_id, overall_rank, positional_rank) VALUES ((SELECT id FROM nfl_players WHERE sleeper_id = '${esc(p.sleeperId)}'), ${overallRank}, ${p._positionalRank});\n`;
  }

  // Generate V9__populate_adp.sql — populate ADP from Sleeper search_rank
  let v9 = `-- Populate ADP (Average Draft Position) from Sleeper search_rank\n`;
  for (const p of top) {
    const adp = p.search_rank ?? 'NULL';
    v9 += `UPDATE nfl_players SET adp = ${adp} WHERE sleeper_id = '${esc(p.sleeperId)}';\n`;
  }

  // Write files
  const v5Path = path.join(MIGRATION_DIR, 'V5__nfl_players.sql');
  const v7Path = path.join(MIGRATION_DIR, 'V7__consensus_rankings.sql');
  const v9Path = path.join(MIGRATION_DIR, 'V9__populate_adp.sql');

  fs.writeFileSync(v5Path, v5, 'utf8');
  fs.writeFileSync(v7Path, v7, 'utf8');
  fs.writeFileSync(v9Path, v9, 'utf8');

  console.log(`\nGenerated: ${v5Path}`);
  console.log(`Generated: ${v7Path}`);
  console.log(`Generated: ${v9Path}`);
  console.log(`\nV5: CREATE TABLE + ${top.length} INSERT statements`);
  console.log(`V7: CREATE TABLE + ${top.length} INSERT statements`);
  console.log(`V9: ${top.length} UPDATE statements for ADP`);

  // Print first 5 players as sanity check
  console.log('\nTop 5 players:');
  for (let i = 0; i < 5; i++) {
    const p = top[i];
    console.log(`  ${i + 1}. ${p.full_name} (${p.position}, ${p.team || 'FA'}) - search_rank: ${p.search_rank}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
