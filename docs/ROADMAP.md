# Fantasy Seers Roadmap — Back to the Pitch

**North star:** the rankings record-keeping tool my league actually uses — build rankings off a consensus/ADP base, lock them at season start, and score them against reality with receipts. Built to portfolio quality. Growth and the following economy (pitch #18/39/68) are **not** goals; they are a possibility gated on dogfooding succeeding — go/no-go review **Feb 2027**.

**Success bar for 2026–27:** ≥3 league-mates besides me maintain boards through the season, and their locked SEASON_START boards get scored in January 2027.

**Parked:** props/points wagering system (stays live, demoted in nav, frozen — no new work; retire-or-keep decided in the offseason) · AI research chatbot (backburner, salvageable from `feature/chatbot-idea`).

---

## 2026 Season Plan (decided 2026-08-13)

Two hard clocks: the league drafts in ~2–4 weeks, and anything not captured before NFL kickoff (~Sept 10) can never be honestly backfilled. Everything below is scoped to those clocks; the original phases (kept below for reference) are amended accordingly.

### Race scope — before the league drafts (~3 weeks)

1. ~~**Repo hygiene** — roadmap + Phase 3 spike docs onto `main`; discard the Java 25 diff (needs a Spring Boot 3.4/3.5 train to be real — offseason); abandon the `appmod` branch; all race work branches from `main` on Java 21.~~ Done 2026-08-13.
2. ~~**Phase 0 salvage** — cherry-pick Board v2 (`BoardSnapshot`, `SnapshotEntry`, `BoardController`, MasterSheetPage rework) from `feature/chatbot-idea`; renumber migrations to V15+; leave chatbot commits behind. Everything else stacks on this.~~ Done 2026-08-14. Board v2 backend extracted manually (not cherry-picked — migration numbering diverged), and MasterSheetPage now reads/saves through the Board v2 API. `feature/chatbot-idea` archived as tag `archive/feature/chatbot-idea`.
3. **Full-universe player ingest** — backend job pulling Sleeper's player dump; upsert all active QB/RB/WR/TE/K + team DEFs, replacing the stale 300-player seed. **Must land before invites go out** (the front door falls back to consensus rankings; a stale 2025 list with no rookies kills adoption on day one). Rankings depth does the relevance filtering, not ingest-time curation.
4. **Daily ADP capture** — scheduled job writing Sleeper ADP into `adp_snapshots (player_id, source, captured_at, value)`, starting immediately. Single-source is fine for now: this series is the raw material for 2027's σ and the stock-chart pages. ADP not captured now is gone forever.
5. **Front door** — Master Sheet becomes `/`; props feed demoted to a secondary nav item, otherwise untouched.
6. **Format, hardcoded** — one app-wide scoring format stamped onto every snapshot at lock time (`scoring_format`/`superflex` columns from the Phase 0 salvage). No format UI this year — a settings dropdown would be a silent foot-gun (wrong-format scoring in January). Placeholder: full PPR, single-QB — **confirm the league's real format before the lock**.
7. **Snapshot locking** — `locked_at` on `board_snapshots`; writes refused after lock; scoring only ever reads locked snapshots.
8. **Expert boards (droppable)** — hand-transcribe 2–3 well-known public preseason top-150s into expert-flagged accounts before the lock; source URL + publish date in the board notes (formal provenance columns are Phase 3). Baselines are mandatory; experts are a bonus — first thing cut if the race runs hot.
9. **Sleeper stats viability check (30 min)** — confirm Sleeper exposes full-season per-player stats without auth, while building the other Sleeper jobs. If it doesn't, find the January truth source now, not in January.

**Deferred from Phase 1:** entrance-screen format setup, seasonal-checkpoint state machine, notes column, choose-your-base. All additive later; none needed to lock a board.

### Kickoff morning (~Sept 10) — the lock

Admin-triggered global lock (analog of the props resolve flow): every user's current board is snapshotted as SEASON_START and frozen — snapshot-everyone, so a board untouched since August still gets scored. **The same transaction freezes two system-owned baseline boards: consensus order and ADP order.** Without consensus-at-kickoff, the Edge metric ("did you beat the crowd") is uncomputable for 2026, permanently. Checklist: league format confirmed and set · player ingest fresh · expert boards in (or consciously dropped) · lock pressed · baselines verified.

### In-season (Sept–Dec)

- ADP capture keeps running (2027 σ + movers/stock-chart data).
- **Oct–Nov:** **Public profile pages** — lightweight social foundation so the platform layer has roots before scores land. Each user gets a public profile showing their locked board (position coverage, bold calls vs. consensus), positional niche tags (auto-derived from where their board diverges most), and a follow button. No feed, no discovery page yet — just a shareable URL and a follower count. This is the minimum scaffold so that when January scores drop, profiles already exist to attach accuracy badges and history to, and the "build a following around your niche" loop can start immediately instead of waiting for a Phase 4 greenlight.
- **Nov–Dec:** build the truth ingest — `player_season_results (player_id, season, scoring_format, fantasy_points, games_played, overall_finish, positional_finish)`, computed from Sleeper raw season stats under the league's format. Computing from raw stats (not scraping someone's finished ranks) is what makes multi-format real in 2027 and keeps ground truth first-party.

### January 2027 — scoring & the reveal

Per the [Phase 3 spike](phase3-scoring-spike.md), with one 2026 amendment: **σ = 1** (methodology v1). Single-source ADP means no cross-site deviation, and a synthesized σ is false precision that can't be defended when a league-mate asks why. Publish plain absolute rank error (**Accuracy**) and consensus-relative (**Edge**), from the spike's per-entry component table unchanged — 2026 rows simply carry σ = 1; real σ arrives with multi-source ADP for 2027. End-of-season resolution job in the mold of the existing prop `ResolutionService`: ingest truth → score every locked snapshot → batch-persist components → aggregate → leaderboards. Awards per the spike, coverage minimums applied.

**Accuracy badges on profiles:** once scores are computed, stamp each profile with accuracy badges (overall accuracy tier, positional niche awards, sleeper/bust badges). These attach to the public profiles built in-season — the shareable URL now carries proof. This is the bridge between long-term rankings credibility and the existing props system: a user's accuracy history becomes a visible trust signal that other users can weigh when deciding whether to follow someone's prop calls.

### Offseason 2027 list

JDK 25 + Spring Boot 3.4/3.5 upgrade (bundled; Boot 3.2.3's Lombok train breaks on JDK 25) · props retire-or-keep decision · multi-source ADP → real σ · format setup UI · seasonal-checkpoint state machine, notes, choose-your-base · credibility-weighted props (accuracy history as a trust signal surfaced on prop feeds — the "long term sets up the short term" bridge) · discovery/explore page for finding rankers by niche · **Phase 4 go/no-go (Feb 2027)** based on whether the league actually used the tool.

---

## Reference: original phase structure

Amendments from the 2026 plan above take precedence where they conflict.

### Phase 0 — Consolidate the foundation

- Salvage Board v2 from `feature/chatbot-idea` onto `main` (board commits only, migrations renumbered V15+).
- Retire legacy rankings (`RankingsController`, `UserRanking`) once Board v2 is live.
- `scoring_format` / `superflex` columns on users ride along; the 2026 plan uses them.

### Phase 1 — Make the rankings tool real _(pitch #1, #8)_

- Format awareness: PPR / half / standard, superflex — entrance-screen setup (pitch lines 13, 166–168). _2026: hardcoded instead._
- Seasonal lifecycle: snapshots at the pitch's checkpoints — end of season, free agency, draft, camp, preseason, season start (lines 158–163). _2026: SEASON_START only._
- Monthly record-keeping (line 20): immutable snapshots as raw material for accuracy scoring.
- Choose your base (line 70): start from consensus _or_ ADP order.
- Notes column per player (line 170).

### Phase 2 — Multi-source ADP intelligence _(pitch #2)_

- `adp_snapshots` time-series. _2026: Sleeper capture already running per the plan above;_ Underdog/ESPN/Yahoo next.
- Derived analytics: median/average ADP, per-site deviation, ADP variance ("variance is confidence", line 66), weekly/monthly movers (lines 9, 122).
- Stock-chart player pages (line 106); best-site / homer-ADP comparisons (line 7).
- **Phase 3 scoring quality (σ) is gated on this phase** — single-source data scores unweighted.

### Phase 3 — Accuracy engine & receipts _(pitch #3)_

Design settled in [phase3-scoring-spike.md](phase3-scoring-spike.md): z-scored absolute rank error with a frozen-consensus baseline (Accuracy + Edge), per-entry component table, all five awards derived from it. Experts score through the identical pipeline with provenance metadata and minimum-coverage rules. _2026 runs this with σ = 1._

### Phase 4 — Public rankings & the following economy _(pitch #18, 39, 68 — gated, Feb 2027)_

- Public/anonymous toggle per board; aggregate data public; view without an account (line 148).
- Follow rankers; profiles with accuracy history + receipts; friend groups as the community layer.
- CSV import/export (lines 135–136, 149).

### Backlog (explicitly not now)

Injury toggles & body/injury history, SOS/OL/defense adjustments, doctors/scouts ranks, mock drafts, dynasty rankings, sponsored awards, offseason threads. Chatbot re-entry slots after Phase 2.

---

**Sequencing logic in one line:** lock boards before kickoff 2026 → capture ADP daily → score everyone in January → let the results decide whether this becomes social.
