# Phase 3 Design Spike — Scoring Rankings Against Actual Finishes

**Status:** design spike, no implementation. Answers the open problem flagged in
[ROADMAP.md](ROADMAP.md) Phase 3: score user ranking boards against end-of-season
actual finishes, std-deviation-weighted.

**Recommendation up front:** store a small **per-entry score component** —
`(user_error, consensus_error, sigma)` per player per board — and derive *everything*
(overall score, positional scores, all five awards) from that one table. The core
formula is z-scored rank error with a consensus baseline: Approach C below, which
combines Approaches A and B.

---

## 1. What "std-deviation-weighted" can mean — three concrete approaches

Setup, common to all three. For a locked board `B` (a `board_snapshot`) and player `p`:

- `u_p` — the user's rank for `p` (from `snapshot_entries.user_rank`)
- `a_p` — the player's *actual* end-of-season finish (overall or positional rank,
  under the board's scoring format) — **data we do not have yet, see §2**
- `c_p` — consensus rank for `p` *frozen at the same checkpoint* as the board
- `σ_p` — standard deviation of `p`'s rank across sources (Phase 2 cross-site ADP
  variance) and/or across community boards — "how much did people disagree about
  this player"
- `E(r) = |r − a_p|` — rank-space absolute error (deliberately not squared; see §1.4)

### Approach A — Z-scored error ("accuracy per unit of uncertainty")

Board score = mean over entries of `E(u_p) / σ_p`. Lower is better.

- **Intuition:** missing on a player the whole world was split on (high σ) is
  forgiven; missing on a "lock" everyone agreed on (low σ) is punished hard. This is
  the textbook reading of "std-deviation-weighted."
- **Consistent-vs-boom-bust:** the ranker who is slightly off on everyone beats the
  ranker who nailed one sleeper and scrambled the rest — 250 small z-errors sum
  smaller than 249 big ones plus one zero. **Rewards calibration.**
- **Weakness:** no notion of *skill vs. the crowd*. A user who copies consensus
  verbatim gets a perfectly respectable score whenever consensus has an average year.
  Chalk is free. That's at odds with the pitch (and with this platform's whole
  "reward going against the crowd" DNA).

### Approach B — Value over consensus ("edge")

Per-player `delta_p = E(c_p) − E(u_p)`; board score = mean delta. Positive = you beat
the crowd on that player; a player where you matched consensus contributes ~0 no
matter what happened.

- **Intuition:** you only earn (or lose) points where you *deviated* and the season
  proved you right (or wrong). Directly measures the thing experts get famous for.
- **Consistent-vs-boom-bust:** the slightly-off-on-everyone ranker who is off *the
  same way consensus is off* scores ≈ 0 — no credit for chalk. The boom-bust ranker
  banks a large positive on the hit and debits on the misses, and can net positive if
  the hit was big enough. **Rewards edge, tolerates chalk as neutral.**
- **Weaknesses:** (1) "best overall" under pure edge can crown a lottery-ticket
  ranker over a genuinely accurate one; (2) it needs consensus *frozen at the same
  checkpoint* — the current `consensus_rankings` table is mutable, so this is a data
  requirement (§2); (3) no σ in it yet.

### Approach D (considered, rejected as core) — σ-weighted rank correlation

Weighted Spearman/Kendall between user order and actual finish order. Bounded,
well-understood, one number. Rejected because it produces **no per-player
components** — sleeper/bust awards and "receipts" (the pitch's headline feature —
per-pick proof) can't be derived from a correlation coefficient. Fine as a
sanity-check metric on an internal dashboard, not as the engine.

### Approach C — recommended: z-scored error *with* the consensus baseline

Store, per snapshot entry:

```
e_user = E(u_p) / σ_p        -- z-error of the user's call
e_cons = E(c_p) / σ_p        -- z-error of consensus on the same player
delta  = e_cons − e_user     -- σ-normalized edge
```

Two published numbers per board, both simple aggregates of the stored components:

- **Accuracy** = mean `e_user` (lower better) → Approach A. Answers "is this board
  good." Drives *best overall / best by position / most wrong*.
- **Edge** = mean `delta` → Approach B in σ units. Answers "did this board beat the
  crowd." Drives *sleeper picker / bust avoider* and the pitch's bragging rights.

Why divide edge by σ too (a real design decision, both directions defensible):
dividing by σ means beating a *confident* consensus (low σ) is worth more per rank
than beating a coin-flip (high σ). This matches "variance is confidence" — high-σ
players were open questions, so disagreeing with the crowd there was cheap. It also
stops the Edge leaderboard from being dominated by lottery tickets on volatile
late-round players. The opposite convention (multiply by σ: "nailing chaos is the
skill") makes sleepers overwhelm everything else; rejected.

### 1.4 Error-function details (apply to whichever approach)

- **Absolute, not squared error.** Squared error makes one season-ending injury
  dominate an entire board — exactly the noise we don't want to measure.
- **Clamp `a_p` at board depth + buffer** (e.g., a top-300 board clamps actual
  finishes at 320). A player who busts to fantasy irrelevance costs a bounded amount;
  otherwise IR randomness swamps skill.
- **Rank space is nonlinear** — being off by 10 at rank 5 is a catastrophe; off by 10
  at rank 150 is noise. v1 can ignore this because σ_p partially absorbs it (top
  players have small σ, so the divisor is small and errors there already weigh more).
  If it's not enough, switch `E` to log-rank distance `|ln(u_p) − ln(a_p)|` later —
  it's a drop-in change to `E`, nothing downstream moves.
- **Injuries:** score as-is in v1. Injury adjustment is explicitly backlog in the
  roadmap; the clamp bounds the damage. Revisit with the injury-toggle work.

---

## 2. Consuming Phase 1 snapshots — and what's still missing

### What Phase 1 already provides

`board_snapshots (user_id, season, snapshot_type)` + `snapshot_entries (snapshot_id,
player_id, user_rank)` with uniqueness on both `(snapshot, player)` and `(snapshot,
rank)` — i.e., a clean, ordered, per-checkpoint board history. That is the correct
input shape; scoring consumes it as-is.

### How scoring consumes it

- **Each snapshot is scored independently** against the same season-end truth. A user
  with MARCH, JUNE, and SEASON_START snapshots gets three scored boards — that *is*
  the "accuracy history with receipts" timeline.
- **The SEASON_START snapshot is canonical** for leaderboards/awards. Earlier
  checkpoints are display/history ("called it in March"). An explicit earliness bonus
  (weighting earlier correct calls higher) is a later refinement — keep v1 to one
  canonical snapshot so scores are comparable.
- **Pipeline shape:** an admin-triggered end-of-season resolution job (direct analog
  of the existing prop `ResolutionService`): ingest actual results → freeze → for
  every locked snapshot, compute per-entry components → batch-persist
  `snapshot_entry_scores` → aggregate into `board_scores` → leaderboards read
  aggregates. No on-the-fly scoring.
- **In-season snapshots** (scoring an October board against rest-of-season finishes)
  need rest-of-season truth splits — punt; v1 scores every checkpoint against
  full-season finishes and labels it as such.

### What's missing (the real gaps)

1. **Truth data — the biggest gap.** Nothing in any phase produces end-of-season
   actual finishes. Needs a `player_season_results (player_id, season,
   scoring_format, fantasy_points, games_played, overall_finish, positional_finish)`
   table, per scoring format (a PPR board must be scored against PPR finishes).
   Sleeper exposes season stats and there's ingestion precedent (`seed-players.js`);
   an admin upload is the fallback. **This should be added to Phase 1 or 2 scope** —
   backfilling truth later is possible but ingesting it live is cheaper.
2. **σ source — a hard dependency on Phase 2.** `σ_p` comes from `adp_snapshots`
   cross-source deviation, optionally blended with cross-community-board deviation
   once there are enough users. Cold-start fallback: positional-tier default σ (or
   σ = 1, degrading gracefully to unweighted error). Worth stating in the roadmap:
   *Phase 3 scoring quality is gated on Phase 2 shipping*, which the current
   sequencing already implies but doesn't say.
3. **Frozen consensus per checkpoint.** `consensus_rankings` is a single mutable
   table; baseline-relative scoring needs consensus *as of the board's checkpoint*.
   Cleanest fix: a system-owned user whose boards are consensus snapshots, one per
   checkpoint — consensus then flows through the exact same snapshot/scoring pipeline
   and appears on the leaderboard as a row ("did you beat consensus" becomes literally
   two rows). Same trick gives an ADP-order baseline board for free.
4. **Format on the board.** Resolved for 2026 by V19: `scoring_format`/`superflex`
   are copied from the centralized app format onto every `board_snapshot`. The
   provisional `FULL_PPR`, single-QB format must be confirmed before locking.
5. **Immutability enforcement.** "Immutable monthly snapshots" is stated intent, but
   the schema doesn't enforce it — entries are editable rows. Add `locked_at` and
   refuse writes after lock; scoring only ever reads locked snapshots.
6. **Player-universe churn.** `nfl_players` is a 300-player seed. Players who finish
   top-100 but aren't in the table (rookie breakouts) silently vanish from scoring.
   Needs full-universe ingestion; a ranked player who leaves the league scores via
   the clamp (§1.4).

---

## 3. Experts: same pipeline, yes — with provenance metadata

**Recommendation: score experts identically, through the same tables and formula.**
An expert is a `User` with a profile flag (`EXPERT`), their transcribed rankings are
ordinary `board_snapshots`. This isn't just convenient — comparability *is* the
product ("you out-ranked Matthew Berry" only means something if both were scored by
one formula). A parallel expert-scoring system would break that and double
maintenance. The system-consensus user in §2.3 is the same pattern.

What experts need *in addition* (not instead):

- **Provenance fields** on the snapshot: `published_at` and a source URL — this is
  the roadmap's "receipts" feature and it's mandatory for experts, since a manually
  transcribed board is only credible with a link. Map `published_at` to the nearest
  checkpoint; if an expert published mid-August, don't pretend it's a March board.
- **Partial-board fairness.** Expert lists are top-100/150, users may rank 300.
  Handled automatically because every aggregate above is a **mean, not a sum** — but
  add a **minimum-coverage rule** per award (e.g., ≥ 24 RBs ranked to qualify for
  best-RB-ranker; ≥ 100 players for best overall). Needed for shallow user boards
  anyway.
- **Positional-only lists** (expert publishes RB ranks only): score positional
  entries, qualify for positional awards only. Falls out of the coverage rule.

---

## 4. Awards: all five derive from the stored per-entry components

This is the payoff of persisting `(e_user, e_cons, delta, σ_p)` per entry rather than
just a board total — **no award needs its own scoring engine**. Each is an
aggregation/filter, with two parameters (a deviation threshold `T` and coverage
minimums):

| Award | Derivation |
|---|---|
| **Best overall** | lowest mean `e_user` across the board (coverage ≥ 100) |
| **Best by position** | lowest mean `e_user` over entries at that position, scored against *positional* finishes (coverage ≥ position minimum) |
| **Sleeper picker** | sum of `delta` over entries where the user ranked the player meaningfully above consensus (`c_p − u_p ≥ T`) — contrarian-up calls that hit |
| **Bust avoider** | sum of `delta` over entries where the user ranked the player meaningfully below consensus (`u_p − c_p ≥ T`), plus consensus-top-D players the user *omitted* entirely (an omission is an implicit bust call — score it as `u_p` = board depth + 1) |
| **Most wrong** | highest mean `e_user` (the booby prize; same coverage rule so nobody "wins" it with a 10-player board) |

`T` should be σ-relative with a floor — e.g., `T = max(10 ranks, 1.0 × σ_p)` — so a
"sleeper call" means disagreeing beyond the crowd's own disagreement, not moving a
volatile player 10 spots. Tune with real data.

Note the split: accuracy awards (best overall/position/most wrong) read `e_user`;
crowd-relative awards (sleeper/bust) read `delta`. That's exactly the
Accuracy-vs-Edge pair from §1 — one component table, two published axes, five awards.

---

## 5. Summary of the recommendation

1. **Core formula:** per-entry z-scored absolute rank error with a frozen-consensus
   baseline (Approach C): `e_user = |u_p − a_p| / σ_p`, `e_cons = |c_p − a_p| / σ_p`,
   `delta = e_cons − e_user`. Clamped actuals, absolute (not squared) error.
2. **Persist components, derive everything:** `snapshot_entry_scores` per player per
   board; `board_scores` (Accuracy = mean `e_user`, Edge = mean `delta`); all awards
   are queries over these.
3. **Pipeline:** end-of-season resolution job in the mold of the existing prop
   `ResolutionService` — ingest truth, score locked snapshots, batch persist.
4. **Snapshot consumption:** every checkpoint scored independently for the history
   timeline; SEASON_START is canonical for leaderboards.
5. **Experts:** same tables, same formula, flagged profiles + `published_at`/source
   provenance + mean-based aggregates with minimum-coverage rules.
6. **Do before Phase 3:** add truth ingestion (`player_season_results`) to Phase 1/2
   scope, freeze consensus per checkpoint via a system-owned board, stamp
   format onto snapshots, enforce snapshot locking, expand the player universe.
   σ quality is gated on Phase 2's `adp_snapshots`.

**Open questions to settle with real data, not more design:** the σ direction for
Edge (§1, divide vs. multiply — recommended divide), the sleeper/bust threshold `T`,
coverage minimums, and whether rank-space nonlinearity needs the log-distance
variant. All four are tunable parameters inside the same architecture.
