# Trending Players — Product Decisions

Decision date: 2026-09-30
Status: Product decisions agreed; feature not implemented by this document.

## Purpose

Give Fantasy Seers users a way to discover popular NFL pickups and check whether those players are rostered in their own Sleeper leagues. This feature is independent of Master Sheet rankings: it does not read, change, or require a personal ranking board.

The first version answers “Who is getting added, and who is not rostered in my selected league?” It does not claim to identify the best pickup or evaluate whether a player improves a user's team.

## Page and discovery

- Add a separate **Trending Players** page and navigation item for both guests and signed-in members.
- Keep Sleeper league selection distinct from Fantasy Seers groups and their existing Leagues page.
- Show general trending pickups immediately, without requiring a Fantasy Seers account or a Sleeper league selection.
- Label the general view **Across Sleeper** so users do not mistake global trends for availability in their league.
- Show pickups only in the first version; no trending-drops tab.
- Use a fixed 24-hour window, labeled **Most added in the past 24 hours**.
- Provide position filters: **All, QB, RB, WR, TE, K, DEF**. Default to All.
- Updates are viewed on the page. The first version sends no alerts or notifications.

## Sleeper league selection

- Every user can enter a Sleeper username and choose their own league.
- Guests can select a league without creating a Fantasy Seers account.
- Support switching between multiple leagues using a dropdown.
- Show availability for one selected league at a time; no combined league view.
- Remember the last selected league according to the persistence rules below.

## Availability and next action

- After selecting a league, default to showing trending players who are **Not rostered** in that league.
- Include a **Show all trending players** control.
- Use **Not rostered**, rather than wording that promises an immediate pickup: an unrostered player may still require a waiver claim.
- Provide an **Open league in Sleeper** button when a league is selected.
- Users make pickups and waiver claims in Sleeper; Fantasy Seers displays discovery information.

## Saved preferences and sign-in behavior

- Save guest league choices on the current device.
- Save signed-in members' league choices to their Fantasy Seers accounts.
- If a guest is viewing League A and signs into an account whose saved league is League B, keep League A on screen.
- Signing in alone must not overwrite the account's saved league.
- An explicit league selection while signed in updates the account's saved choice.

## Freshness and failures

- If Sleeper temporarily stops responding, show previously loaded trends when available, with an **Updated...** timestamp indicating their age.
- If league rosters cannot refresh, mark availability **unknown/unavailable**. Do not label players Not rostered based on a failed lookup or an outdated roster claim.
- Missing roster data must never be treated as an empty league.
- Make loading, stale-data, and failure states clear. If there are no cached trends, show a failure state rather than inventing results.

## Intended user flow

1. Open Trending Players and browse the most-added NFL players across Sleeper over the past 24 hours.
2. Optionally enter a Sleeper username and select a league.
3. Browse unrostered trending players, filter by position, or choose to show all trending players.
4. Switch leagues when needed.
5. Open the selected league in Sleeper to investigate a player or submit a pickup/waiver claim.

## Implementation follow-up

These are engineering tasks and unresolved implementation details, not additional approved product features:

- Add trending, username/league lookup, and roster retrieval support alongside the existing Sleeper player import.
- Verify endpoint behavior, coverage/limits, and the league-link destination before relying on them.
- Choose refresh intervals, cache expiry, and bounded stale-trend retention. Do not infer an approved duration beyond the agreed 24-hour trending window.
- Account for every roster slot, including bench, injured reserve, and taxi players where applicable, when determining whether a player is rostered.
- Ensure player details resolve beyond the Master Sheet's top-300 pool.
- Define list sizing, empty results, invalid usernames, users without leagues, missing player details, and unavailable saved leagues.
- Add account preference storage and keep guest/member preferences separate under the agreed sign-in behavior.
- Verify applicable Sleeper API usage terms and provide source attribution.

Suggested implementation sequence: public trends page and backend endpoint; league selection and roster filtering; saved preferences and sign-in handling; failure-state and browser verification.
