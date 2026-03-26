const SPORT_CLASSES = {
  NFL: "sport-nfl",
  NBA: "sport-nba",
  MLB: "sport-mlb",
  NHL: "sport-nhl",
};

export function getSportClass(sport) {
  return SPORT_CLASSES[sport] ?? "sport-default";
}
