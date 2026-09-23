const NFL_TEAM_DATA = [
  { code: "ARI", name: "Arizona Cardinals", logoSlug: "ari" },
  { code: "ATL", name: "Atlanta Falcons", logoSlug: "atl" },
  { code: "BAL", name: "Baltimore Ravens", logoSlug: "bal" },
  { code: "BUF", name: "Buffalo Bills", logoSlug: "buf" },
  { code: "CAR", name: "Carolina Panthers", logoSlug: "car" },
  { code: "CHI", name: "Chicago Bears", logoSlug: "chi" },
  { code: "CIN", name: "Cincinnati Bengals", logoSlug: "cin" },
  { code: "CLE", name: "Cleveland Browns", logoSlug: "cle" },
  { code: "DAL", name: "Dallas Cowboys", logoSlug: "dal" },
  { code: "DEN", name: "Denver Broncos", logoSlug: "den" },
  { code: "DET", name: "Detroit Lions", logoSlug: "det" },
  { code: "GB", name: "Green Bay Packers", logoSlug: "gb" },
  { code: "HOU", name: "Houston Texans", logoSlug: "hou" },
  { code: "IND", name: "Indianapolis Colts", logoSlug: "ind" },
  { code: "JAX", name: "Jacksonville Jaguars", logoSlug: "jax" },
  { code: "KC", name: "Kansas City Chiefs", logoSlug: "kc" },
  { code: "LV", name: "Las Vegas Raiders", logoSlug: "lv" },
  { code: "LAC", name: "Los Angeles Chargers", logoSlug: "lac" },
  { code: "LAR", name: "Los Angeles Rams", logoSlug: "lar" },
  { code: "MIA", name: "Miami Dolphins", logoSlug: "mia" },
  { code: "MIN", name: "Minnesota Vikings", logoSlug: "min" },
  { code: "NE", name: "New England Patriots", logoSlug: "ne" },
  { code: "NO", name: "New Orleans Saints", logoSlug: "no" },
  { code: "NYG", name: "New York Giants", logoSlug: "nyg" },
  { code: "NYJ", name: "New York Jets", logoSlug: "nyj" },
  { code: "PHI", name: "Philadelphia Eagles", logoSlug: "phi" },
  { code: "PIT", name: "Pittsburgh Steelers", logoSlug: "pit" },
  { code: "SF", name: "San Francisco 49ers", logoSlug: "sf" },
  { code: "SEA", name: "Seattle Seahawks", logoSlug: "sea" },
  { code: "TB", name: "Tampa Bay Buccaneers", logoSlug: "tb" },
  { code: "TEN", name: "Tennessee Titans", logoSlug: "ten" },
  { code: "WAS", name: "Washington Commanders", logoSlug: "wsh" },
];

const NFL_TEAM_ALIASES = {
  JAC: "JAX",
  OAK: "LV",
  SD: "LAC",
  STL: "LAR",
  WSH: "WAS",
};

export const NFL_TEAM_INFO = Object.fromEntries(
  NFL_TEAM_DATA.map(({ code, name, logoSlug }) => [
    code,
    {
      code,
      name,
      logoUrl: `https://a.espncdn.com/i/teamlogos/nfl/500/${logoSlug}.png`,
    },
  ])
);

export const NFL_TEAMS = NFL_TEAM_DATA.map(({ name }) => name);

export function getNflTeamInfo(teamCode) {
  const normalized = teamCode?.trim().toUpperCase();
  if (!normalized) {
    return { code: "FA", name: "Free Agent", logoUrl: null };
  }

  const canonicalCode = NFL_TEAM_ALIASES[normalized] || normalized;
  return NFL_TEAM_INFO[canonicalCode] || {
    code: normalized,
    name: normalized,
    logoUrl: null,
  };
}

export const NBA_TEAMS = [
  'Atlanta Hawks', 'Boston Celtics', 'Brooklyn Nets', 'Charlotte Hornets',
  'Chicago Bulls', 'Cleveland Cavaliers', 'Dallas Mavericks', 'Denver Nuggets',
  'Detroit Pistons', 'Golden State Warriors', 'Houston Rockets', 'Indiana Pacers',
  'Los Angeles Clippers', 'Los Angeles Lakers', 'Memphis Grizzlies', 'Miami Heat',
  'Milwaukee Bucks', 'Minnesota Timberwolves', 'New Orleans Pelicans', 'New York Knicks',
  'Oklahoma City Thunder', 'Orlando Magic', 'Philadelphia 76ers', 'Phoenix Suns',
  'Portland Trail Blazers', 'Sacramento Kings', 'San Antonio Spurs', 'Toronto Raptors',
  'Utah Jazz', 'Washington Wizards',
]
