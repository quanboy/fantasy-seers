# Community Features and Props Return Plan

Date: 2026-09-28

Status: Planned. Scope agreed after a grill-me session (2026-09-23 to 2026-09-28).
Nothing in this document is implemented yet.

## Why this plan exists

The preseason plan was: league-mates rank players, boards lock at kickoff, and
boards are scored in January. The site was not ready by kickoff, so no
league-mate submitted a board and there is nothing to score. This plan salvages
the 2026 season and adds community features that give people a reason to come
back while boards are frozen.

## Guiding decisions

- **The rankings board stays the centerpiece.** Props and Keep/Trade/Cut trios
  support it. Over time, every feature should be part of a broader community
  tool.
- **Rest-of-season board.** Boards lock before Week 6 kickoff
  (**Thursday 2026-10-08**) and are scored in January against Half-PPR finishes
  over **Weeks 6–17**. The scorer is unchanged: `BoardAccuracyScorer`, mean
  absolute rank error, depth 300, and a no-show cap at rank 320.
- **The invite is the deadline, not the features.** The league invite goes out
  **Thursday 2026-10-01** whatever state the features are in.
- **Nothing depends on the admin.** After launch, props are created, resolved,
  and settled without anyone (including the site owner) posting, approving, or
  resolving by hand.
- **League-scoped by default.** League props are scoped to the league group.
  Public props would be an empty feed with about 12 users.

## Timeline

### Before the lock

| By | Item | Section |
| --- | --- | --- |
| 2026-09-30 | Finish `feat/public-homepage` and merge, or pause it | — |
| 2026-09-30 | Move to rank | [1](#1-move-to-rank) |
| 2026-10-01 | League invite sent | [2](#2-league-invite) |
| 2026-10-07 | Scoring start week recorded on boards (V23) | [3](#3-scoring-start-week) |
| 2026-10-07 | Integration test: lock and save happening at the same time | [4](#4-lock-day-hardening) |
| 2026-10-08 | Run the lock, then `pg_dump` | [4](#4-lock-day-hardening) |

### After the lock (in dependency order)

1. Sleeper weekly stats adapter ([5](#5-sleeper-weekly-stats-adapter))
2. Prop economy fixes ([6](#6-prop-economy))
3. Automatic props: head-to-head first, then over/under ([7](#7-automatic-props))
4. League-mate props: templated first, then free-text ([8](#8-league-mate-props))
5. Keep/Trade/Cut trios and crowd ranking ([9](#9-keeptradecut-trios-and-crowd-ranking))
6. Notifications (deferred, [10](#10-notifications-deferred))

Trios come after props because props pay off every week, while trios pay off
mostly in January.

---

## 1. Move to rank

**Problem.** Ranking 300 players by drag-and-drop is too much work, especially on
a phone. Search disables dragging (`MasterSheetPage.jsx`: "Clear search to
reorder"), so moving a player from #150 to #40 means scrolling and dragging 110
rows. Big, confident calls are exactly what make January receipts interesting,
and right now they're the hardest thing to do.

**Behavior.**
- Add a **"Move to #"** action on every board row and every search result.
- The user enters a target rank (1–300). The player is inserted there, players
  in between shift by one, and positional ranks are recalculated the same way
  dragging recalculates them.
- It works while a search or position filter is active. The action targets the
  full board rank, not the filtered position.
- Saving uses the existing `PUT /api/v1/boards/{id}/entries` flow. No backend
  change.
- Disabled when the board is locked. For guests, it updates the guest draft
  (`utils/guestDraft.js`).

**Done when.**
- Tests cover moving up, moving down, moving to #1 and #300, rejecting
  out-of-range input, and moving while a search or position filter is active.
- It's usable on a mobile viewport without dragging.

## 2. League invite

Send on 2026-10-01 regardless of feature status. Signup no longer needs a code
(`4f20ccd`). The message includes:
- the site link
- the league group invite code
- "Boards lock Thursday Oct 8 at kickoff and are scored in January on Weeks 6–17."

## 3. Scoring start week

Record the first scored week on each board snapshot, the same way V19 recorded
the scoring format, so January scoring reads the window from the board instead
of a hard-coded constant.

- `V23__stamp_board_scoring_window.sql`: add `scoring_start_week` (int, nullable)
  to `board_snapshots`.
- `BoardLockService.lockSeason` sets it (6 for 2026) on every board it locks,
  including boards it fills in for users who never edited.
- The start week comes from configuration (for example
  `LEAGUE_SCORING_START_WEEK=6`) next to the other league format settings. The
  end week stays fixed at 17.
- Lock already turns PRESEASON boards into SEASON_START boards. No new
  `SnapshotType` is needed.

## 4. Lock-day hardening

- Add one `@DataJpaTest`/Testcontainers integration test showing that a board
  save running at the same moment as `lockSeason` either finishes before the
  lock or is rejected with 409 after it. The lock must never leave a board
  half-written. Every existing backend test uses mocked repositories.
- On 2026-10-08: run `POST /api/admin/boards/lock?season=2026` before kickoff,
  check the result, then run `pg_dump` immediately.

---

## 5. Sleeper weekly stats adapter

One adapter serves automatic prop resolution (weekly) and January board scoring
(Weeks 6–17). It's needed by about Week 7, so props are its first live test,
three months before the scoring that matters most.

- Fetch weekly player stats from Sleeper and compute **Half-PPR points** per
  player per week, including DEF and K scoring.
- `pointsFor(playerId, week)` powers prop resolution.
  `finishRanks(startWeek, endWeek)` turns summed points into overall finish
  ranks for `BoardAccuracyScorer`.
- Write it test-first against recorded Sleeper fixtures. The network call is a
  thin client (following `SleeperPlayerClient`); the scoring math is pure and
  gets unit tests.
- Store fetched weekly stats (new table in a later migration) so resolution and
  January scoring don't depend on Sleeper being up at the moment they run.

## 6. Prop economy

Today (`ResolutionService`): pari-mutuel pool, winners split the losing pool in
proportion to their wagers after a **5% rake**, one-sided props are refunded,
everyone starts with 1,000 points, and nothing ever replenishes them. Across 12
weeks, the rake drains points and busted players quit.

Changes:
- **Remove the 5% rake.** It's a zero-sum pot among friends.
- **Weekly floor.** Every Tuesday, top up anyone below 200 points to exactly 200,
  but **only if they wagered in the previous week**. This stops people from
  busting on purpose to get free points. Record top-ups as a `BONUS`
  `PointTransaction`.
- **League leaderboard ranks net prop profit** for the season: payouts minus
  wagers, **excluding** top-ups and the starting balance. Keep the point-bank
  total as a secondary display only.
- Keep the pari-mutuel contrarian reward: winners on the minority side collect
  more.

## 7. Automatic props

These are the base supply of props. The feed fills every week with no one
posting anything. Props are created per NFL week, scoped to the league group,
close at each player's game kickoff (or the earliest game of the pair), and
resolve automatically from the stats adapter.

**Head-to-head (build first).** "Will Player A outscore Player B in Half-PPR this
week?" (YES = A).
- Choose pairs where the league's **locked boards disagree most**, meaning
  members rank the two players in opposite order.
- Fallback when boards are mostly untouched: pairs with close ADP and different
  positions.
- Skip players who are injured, out, or on bye (the `status` field from the
  daily sync).

**Over/under (build second).** "Will Player A score over 14.5 Half-PPR points?"
- Lines come from **Sleeper projections**, rounded to .5 so there are no ties.
- That endpoint is undocumented. If the projection fetch fails, **skip that
  week's over/unders** and report it to Sentry. Head-to-heads still run.

**Schema.** V6 dropped `stat_key`, `stat_threshold`, and `stat_direction` from
props. Automatic and templated props need structured fields again: prop type,
player references, stat, line, NFL week, and resolution source. Add these in a
new migration; don't reuse the dropped names without re-checking their meaning.

## 8. League-mate props

User-submitted GROUP props **open immediately, with no admin approval**. The
admin only steps in to moderate.

**Templated (build first).** League-mates build props from structured parts
(player, stat, over/under or versus, line, week). They resolve automatically,
exactly like automatic props, and nobody can cheat them.

**Free-text (build second).** For props about each other ("Will Mike bench his
Week 1 QB?").
- The **author resolves** their own prop.
- The **author can't wager** on their own free-text prop. This is a check when a
  vote comes in.
- If the author hasn't resolved within **72 hours after close**, all wagers are
  **refunded automatically**.
- No dispute system in v1. The group chat handles disputes, and a bad call can
  be fixed manually. Build disputes only if they actually happen.

## 9. Keep/Trade/Cut trios and crowd ranking

Modeled on KeepTradeCut's "Your Thoughts?" prompt, but **separate from the user's
board**. Answers feed a shared crowd ranking. They never reorder anyone's board.

- **Prompt:** three players, each with Keep / Trade / Cut. The question is
  **"Who scores the most Half-PPR points over the rest of the season?"**, not
  dynasty value.
- **Format bar** is read-only, taken from the league format:
  `Half PPR · 12 Tm · 1QB`. There are no toggles.
- "I don't know all of these players" skips to the next trio.
- **Trio selection:** players close together in consensus rank, with mixed
  positions (cross-position calls are the hard, useful ones).
- **Crowd ranking:** aggregate everyone's answers (for example a pairwise
  win-rate or Elo-style rating). Show it only after a **minimum number of
  answers** per player. With about 12 users it will be thin without that
  threshold.
- **Graded in January:** each trio is a small prediction (A > B > C over the
  scored weeks), so trios get their own receipts. The crowd ranking is shown
  next to consensus and Sleeper ADP as another baseline.
- A user's trios can disagree with their own board. That's a feature ("your
  trios think you're too low on X"), not a bug.

## 10. Notifications (deferred)

The app has no email, push, or webhook infrastructure, so new props and results
only reach people who open the site. The channel depends on where the league
chats:
- GroupMe or Discord: a bot posts to the chat through a webhook (Thursday: new
  props; Tuesday: results).
- iMessage, WhatsApp, or Sleeper chat: a weekly email digest instead.

Revisit after props ship.

---

## Open questions

- **Public vs league props.** `feat/public-homepage` makes the props feed
  browsable by guests, but this plan scopes new props to the league group. We
  need to decide whether some automatic props should also be PUBLIC so guests
  see a live feed.
- **Status of the public homepage branch.** Merge or pause it by 2026-09-30.
- **Where the league chats**, which decides the notification channel.
- **Crowd ranking method and answer threshold**, to settle before building
  trios.

## Success check

The [2026 checkpoint](ROADMAP.md) still applies: at least 3 league-mates have a
customized board locked on 2026-10-08 and get real accuracy scores in January
2027. Weekly signal before then: how many league-mates vote on at least one prop
each week.
