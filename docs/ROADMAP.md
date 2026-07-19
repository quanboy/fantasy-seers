# Fantasy Seers Roadmap — Back to the Pitch

**North star (from elevatorPitch):** a rankings-and-ADP intelligence platform where anyone builds rankings off a consensus/ADP base, accuracy is tracked with receipts, and good rankers earn a following.

**Parked:** props/points wagering system (stays live, frozen — no new work) · AI research chatbot (backburner, salvageable later from `feature/chatbot-idea`).

---

## Phase 0 — Consolidate the foundation _(~1 week)_

Land what exists cleanly before building on it.

- **Salvage Board v2 from `feature/chatbot-idea`** onto `main`: cherry-pick only the board commits (`BoardSnapshot`, `SnapshotEntry`, `BoardController`, MasterSheetPage rework), renumber its migrations to **V15+**, leave all chatbot commits behind.
- **Retire legacy rankings** (`RankingsController`, `UserRanking`) once Board v2 is live — the branch already noted this cleanup as pending.
- Bonus already in the branch: `scoring_format` / `superflex` columns on users — keep them; Phase 1 uses them.

_Existing assets used: Board v2 branch work, Railway/prod infra as-is._

## Phase 1 — Make the rankings tool real _(pitch #1, #8)_

Turn Master Sheet from "reorder a list" into the record-keeping tool the pitch describes.

- **Format awareness:** PPR / half / standard, superflex — entrance-screen style setup (pitch lines 13, 166–168), wiring up the columns Phase 0 landed.
- **Seasonal lifecycle:** snapshot boards at the pitch's checkpoints — end of NFL season, end of free agency, end of draft, training camp, preseason, season start (lines 158–163). Board v2's `snapshotType` becomes a real state machine; this also finally answers the branch's deferred "board locking" question.
- **Monthly record-keeping** (line 20): immutable monthly snapshots so a user's history accumulates — this is the raw material for accuracy scoring in Phase 3.
- **Choose your base** (line 70): start a board from consensus _or_ ADP order.
- Notes column per player (line 170).

_Existing assets used: Board v2, ConsensusRanking, MasterSheetPage/@dnd-kit._

## Phase 2 — Multi-source ADP intelligence _(pitch #2 — the first real differentiator)_

- **New schema:** `adp_snapshots (player_id, source, captured_at, value)` — replaces the single `adp` int with time-series, multi-source data. Sleeper first (ingestion already exists), then Underdog/ESPN/Yahoo as feasible.
- **Derived analytics:** median/average ADP, per-site deviation, **ADP variance** ("variance is confidence", line 66), weekly/monthly **movers** (lines 9, 122).
- **Stock-chart player pages** (line 106): ADP over time per source.
- **Best site / homer ADP** style comparisons (line 7) as data allows.

_Existing assets used: NflPlayer table, seed-players.js Sleeper pipeline, dashboard UI patterns._

## Phase 3 — Accuracy engine & receipts _(pitch #3, lines 74, 79, 91–96)_

The moat. Nobody does this well ("Fantasy pro accuracy data history sucks", line 100).

- **Scoring model:** rankings vs. end-of-season actual finishes, std-deviation-weighted (line 91). This is the open design problem the pitch itself flags (line 74) — worth a short design spike first.
- **Expert tracking:** manually log pros' public rankings to start (line 98 says exactly this), stored as boards owned by "expert" profiles.
- **Awards & leaderboards:** best overall / by position / sleeper picker / bust avoider / most wrong (lines 93–96, 57–61) — reusing the existing leaderboard UI.
- **Receipts** (line 79): link a ranking snapshot to the tweet/video/article that backs it up.

_Existing assets used: Phase 1 snapshots as input data, LeaderboardPage, points/gold design tokens._

## Phase 4 — Public rankings & the following economy _(pitch #18, 39, 68)_

- **Public/anonymous toggle** per board; overall aggregate data always public.
- **View ranks with no account** (line 148) — the growth surface.
- **Follow rankers**, profile pages showing accuracy history and receipts; friend groups evolve into the community layer.
- **CSV import/export** (lines 135–136, 149) — lets creators bring existing sheets in, keeps them here.

_Existing assets used: auth/roles, FriendGroup + invites, ProfilePage._

## Backlog (explicitly not now)

Injury toggles & body/injury history, SOS/OL/defense adjustments, doctors/scouts ranks, mock drafts, dynasty rankings, sponsored awards, offseason threads — all pitch items that depend on Phases 2–3 data existing first. Chatbot re-entry slots naturally after Phase 2 (more data = better research assistant).

---

**Sequencing logic in one line:** Phase 1 makes users _generate_ ranking history → Phase 2 gives them _data worth ranking against_ → Phase 3 _scores_ everyone → Phase 4 makes the scores _social_. Each phase is independently shippable on the current stack — no rewrites, one salvage operation, two systems frozen.
