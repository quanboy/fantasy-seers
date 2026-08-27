# Pre-Launch Plan — Master Sheet for the 2026 League

Status as of 2026-08-27. The rank → lock mechanic works end-to-end. Security
fixes 1–4, item #5 (registration gating + leaderboard lockdown), and item #8
(mobile drag-and-drop) have been **applied** on this branch. Remaining items
before league-mates join: **#6 (backups) and #7 (Railway env vars)** — both are
ops/config tasks, no code changes needed.

---

## 5. Gate who can register and who shows on the leaderboard — DONE

**Applied.** Registration now requires an invite code validated against the
`REGISTRATION_INVITE_CODE` env var (`AuthService.java`). If the env var is empty,
registration is open (backwards-compatible for local dev). The global leaderboard
(`/api/leaderboard/global`) is now behind `.authenticated()` in `SecurityConfig`.

**To activate on Railway:** set `REGISTRATION_INVITE_CODE` to whatever you want to
text your league-mates. The register form now has a required "Invite Code" field.

**Still nice-to-have (not done):** enforce `friend_groups.max_members` in
`FriendGroupService.joinGroup`.

---

## 6. Turn on database backups before lock day

**Problem.** There is no backup story anywhere in the repo. User boards live only
in `board_snapshots` / `snapshot_entries`. If the Railway Postgres volume is lost,
**every ranking is gone** — the NFL player universe self-heals from the next
Sleeper sync, but hand-entered rank order does not. For a one-shot preseason draft
board this is the highest-consequence data risk.

**Do:**
1. Enable Railway's managed Postgres backups (Railway dashboard → Postgres service
   → Backups). Confirm the schedule and retention.
2. Take a **manual `pg_dump` immediately after the admin lock runs** and store it
   off-Railway (e.g. download locally / cloud drive). This is the irreplaceable
   snapshot — locked boards never change again, so one dump preserves the season.
   ```bash
   pg_dump "$DATABASE_URL" --no-owner --format=custom -f fantasy-seers-locked-2026.dump
   ```
3. Optional: a tiny read-only export endpoint or admin CSV of all locked boards, so
   there's a human-readable copy independent of Postgres internals.

**Acceptance:** a restore has been tested at least once (spin up a throwaway DB,
`pg_restore`, confirm boards load), and a post-lock dump exists off-platform.

---

## 7. Set the Railway environment correctly (do this first — cheapest, highest-leverage)

Several of these are silent-failure traps: the app deploys "successfully" but is
broken or insecure. Verify each on the Railway service before inviting anyone.

**Backend service:**
- `JWT_SECRET` — random, ≥48 bytes (`openssl rand -base64 64`). The compose
  fallback has been removed, so a missing value now fails loudly instead of using a
  public default — good, but Railway must still supply it.
- `SPRING_PROFILES_ACTIVE=prod` — otherwise SQL logging is on and pool tuning is off.
- `CORS_ALLOWED_ORIGINS=https://<your-frontend>.up.railway.app` — if missing/misspelled,
  every request fails with an opaque CORS error and no server-side signal. Do **not**
  set it to `*` (see audit finding 9 — `allowCredentials(true)` + wildcard reflects any origin).
- `SECURITY_TRUST_FORWARDED_FOR=true` — **new flag, must be true on Railway.** The
  app is behind Railway's proxy; with it false, `getRemoteAddr()` returns the proxy
  IP and all users share a single auth rate-limit bucket (10 logins/min total →
  lockouts during a signup rush). Locally/direct, keep it false.
- `LEAGUE_FORMAT_CONFIRMED=true` — **the lock-day trap.** With this false (the
  default), the admin lock button silently returns 409 and does nothing; boards stay
  editable past kickoff with no alarm. Set it true only after you've confirmed the
  real league scoring (`LEAGUE_SCORING_FORMAT`, `LEAGUE_SUPERFLEX`). There is
  currently no in-app way to set this — it requires the env var + redeploy, so plan
  to do it a day before the draft, not during.
- (If you add registration gating per #5) `REGISTRATION_INVITE_CODE` /
  `REGISTRATION_OPEN`.

**Frontend service (build-time — Vite bakes these into the bundle):**
- `VITE_API_BASE_URL=https://<your-backend>.up.railway.app/api` — **must be a build
  variable, not just runtime.** If absent, the build silently succeeds and the app
  falls back to `/api` → nginx proxy → a hostname that doesn't exist on Railway →
  a fully deployed, fully broken frontend with 502s.
- `VITE_SENTRY_DSN` — optional.

**Acceptance:** a checklist run against the live Railway services confirming each
var is present and correct; smoke-test login + board load + a dry-run lock on a
throwaway account.

---

## 8. Fix mobile drag-and-drop (most of the league will use phones) — DONE

**Applied.** `MasterSheetPage.jsx` now uses `TouchSensor` (with 150ms delay /
5px tolerance), `PointerSensor` (with 5px distance constraint), and
`touch-action: none` on the drag handle. The O(n) `findIndex` per row was
replaced with a precomputed `overallIndexMap` (`useMemo`).

**Still to verify:** test on a real phone — drag a player, save, reload, confirm
order persists. The 300-row list is still unvirtualized; if it feels laggy on
older phones, virtualize with `react-window` or similar.

---

## Not in this plan (tracked elsewhere)

- **January scoring** — entirely unbuilt (no truth-data ingestion, no scoring
  service, no results table). Per `docs/ROADMAP.md` this is a Nov–Dec build. It is
  *not* a blocker for preseason rank-and-lock, but locked boards are unscoreable
  until it lands. See `docs/phase3-scoring-spike.md`.
- **Player search / rostering players outside the top 300** — currently impossible;
  relevant to scoring rookie breakouts. Decide before scoring, not before lock.
- **Post-lock registrants get a fresh unlocked board** — the lock is a one-shot
  sweep, not a persistent per-season gate. Mitigation for 2026: run the lock only
  after everyone has registered. A durable fix (a season-locked flag checked in
  `BoardService.getMySheet`) can wait.
