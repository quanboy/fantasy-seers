# Public Homepage and In-Page Authentication Plan

Date: 2026-09-23

Status: Design agreed after a grill-me session. Implementation has not started.

## Goal

Let people experience Fantasy Seers before creating an account. The Master Sheet
at `/` becomes a public homepage, and `/props` becomes a browsable public feed.
Login and signup happen in a dialog over the current page, with a full-screen
version on mobile.

## Agreed product behavior

### Public browsing and navigation

- Guests can view real default player rankings, filter/search the Master Sheet,
  and rearrange players before signing up.
- Guests can browse public props. Voting and account writes require login.
- Guest navigation contains Master Sheet and Props Feed, with Log in and Sign up
  available in the header.
- Leagues, Leaderboard, and Profile appear after login. Admin navigation remains
  restricted to administrators.
- Keep the existing Master Sheet and app styling; a separate marketing homepage
  is not part of this work.

### Login and signup

- Header buttons and protected actions open the same login/signup dialog.
- Visitors can switch between Log in and Sign up or close the dialog and keep
  browsing. Closing or failing authentication preserves their guest work.
- Signup is open to everyone and asks only for username, email, and password.
  Favorite teams and alma mater remain editable later in Profile.
- Remove the account registration invite-code requirement. Private league
  invitations and membership checks remain in place.
- Existing `/login` and `/register` links open the corresponding dialog over the
  homepage. `/master-sheet` continues to resolve to `/`.
- Logging in from the header does not automatically save rankings or place a vote.

### Guest rankings and saved boards

Guest rankings are a separate browser draft, not an account-owned board. Preserve
them across refreshes when browser storage is available. Separate guest storage
from existing account draft storage, and identify drafts by season and scoring
format, including the superflex setting.

| Trigger and account state | Result |
| --- | --- |
| Guest clicks Save and creates an account | Save the guest rankings after account creation succeeds. |
| Guest clicks Save and logs into an account without saved rankings | Save the guest rankings if the board is editable. |
| Guest clicks Save and logs into an account with different saved rankings | Show one explicit choice: Keep saved rankings or Replace saved rankings. Explain that replacement overwrites the existing order. |
| Guest logs in from the header | Show the account's saved board and a notice offering View guest rankings or Discard. Do not overwrite the account board. |
| Account board is season-locked | Keep the account board immutable. Retain access to the guest version as a browser-only practice board. |

Choosing to view a guest draft does not save it. Keep both versions available
until the user explicitly saves over the account board or discards the guest
draft. Clear a guest draft only after a successful save or explicit discard.

Validate stored player IDs against current data before restoring a draft. A
stale, incompatible, or invalid draft must not silently replace the current
board. Failed saves must leave the user's work available to retry. If browser
storage is unavailable, preserve the current in-memory draft and do not claim it
will survive a refresh.

### Voting after authentication

1. A guest starts voting on a public prop, opening the authentication dialog.
2. After authentication, refresh the prop and the user's current point balance.
3. Return to that prop's voting form, where the user explicitly confirms the
   choice and wager.
4. If voting closed during authentication, show "Voting has closed." If the
   account already voted, show that state instead of submitting another vote.

Authentication alone never spends points. Cancelling authentication cancels the
pending voting action without submitting anything.

## Repository findings

These findings describe the source inspected during planning, not production
verification. Recheck the current checkout before implementation.

- `frontend/src/main.jsx` currently wraps the shared layout and homepage in
  `PrivateRoute`, which redirects guests to `/login`.
- `BoardService.getMySheet` can create an account-owned board as part of loading
  it. Guest browsing needs a separate read-only endpoint.
- `DefaultBoardRankingService` supplies the current default player rankings and
  can be reused for the public response.
- `GET /api/props/public` already supports anonymous requests and selects public
  props for guests. Personal boards and other protected endpoints must remain
  authenticated.
- `frontend/src/api/client.js` currently redirects authentication errors to
  `/login`. `AppLayout` polls the account endpoint, and `Dashboard` loads profile
  data; these paths need guest-aware behavior.
- `BoardService.upsertEntries` replaces a board's ranking entries and rejects
  locked-board writes. `MasterSheetPage` currently removes local account drafts
  when loading locked boards, so guest drafts need separate handling.
- `AuthService` currently enforces `REGISTRATION_INVITE_CODE` when configured.
  Open signup requires removing that backend requirement as well as the form
  field and obsolete configuration/documentation references.

## Implementation sequence

### 1. Public data access

Add a read-only public rankings endpoint backed by
`DefaultBoardRankingService`. Return the player list and the season/scoring
metadata needed by the guest sheet, without creating users, boards, or entries.
Permit only the intended public read route in `SecurityConfig`; leave personal
board reads and writes protected. Reuse the existing public props endpoint.

Add backend tests proving anonymous reads succeed without persistence writes,
private data stays protected, and anonymous board/vote writes are rejected.

### 2. Shared public shell and authentication dialog

Make the homepage and props feed public within the shared layout. Keep private
routes and admin access guarded. Add guest navigation and header actions, and
extract the existing authentication forms into the shared dialog.

Implement dialog focus management, keyboard dismissal, focus restoration,
accessible labels, inline errors, and mobile full-screen presentation. Make
legacy authentication URLs open the new flow. A direct private-page visit
should prompt authentication over the homepage and return to the intended
internal destination after login; cancelling leaves the visitor on the homepage.

Track why authentication was opened: header, ranking save, voting, or private
navigation. Resume only the intended action, once, after success. Disable
duplicate submissions and preserve guest work on failure or dismissal.

Stop account polling and profile requests for guests. Replace hard redirects on
session expiry with a state transition that preserves drafts and offers the
dialog. Do not turn ordinary forbidden-access errors into repeated login loops.
Refresh or clear personalized page data when the active account changes or logs
out, so guest views do not retain private account content.

Remove the account invite gate and simplify signup. Preserve password validation,
authentication rate limits, private league membership rules, and profile editing.
Update auth and navigation tests alongside the behavior.

### 3. Guest drafts and account reconciliation

Add guest draft storage separately from account drafts. Reuse Master Sheet
ranking, filtering, and drag behavior for guests. Implement the transition table
above, including explicit replacement, ordinary header login, failed saving,
view/discard controls, and locked-board practice previews.

Read the authenticated board before deciding whether saving needs confirmation.
Do not overwrite an existing account draft as a side effect of login. Recheck
save eligibility on the backend; a board that locks while authentication or
confirmation is open must reject the write and preserve the guest draft.

Test refresh recovery, account transitions, storage failure, incompatible drafts,
failed saves, explicit replacement, and locking during the flow.

### 4. Voting continuation

Have guest vote actions request authentication with the selected prop as context.
After success, reload the prop and point balance before showing the voting form.
Keep the normal explicit vote submission step and backend vote validation.

Test cancellation, login/signup failure, closed or unavailable props, accounts
that already voted, and confirmation exactly once. A header login must not replay
a previously cancelled voting action.

### 5. Full validation

Run the backend Maven tests, frontend Vitest suite, and frontend production
build. Use the repository Maven wrapper and the Windows npm executable where
appropriate:

```powershell
# From backend/
.\mvnw.cmd test

# From frontend/
npm.cmd run test:run
npm.cmd run build
```

Check the complete guest-to-account flows in a browser at desktop and mobile
sizes. Verify keyboard focus, dialog switching/dismissal, old login URLs, private
deep links, draft recovery, overwrite confirmation, locked boards, session
expiry, and voting after authentication. Check that guest browsing produces no
repeated account requests or redirect loops.

Report unit/build results, browser results, and any production checks separately.
Passing source tests alone does not establish that the interactions work.

## Scope and delivery boundary

No database migration is expected. This work does not change season locking,
scoring, payouts, or private league access rules, and it does not make the
leaderboard public. The existing architecture drawing remains a description of
the current system; publishing it alongside this plan does not mean the proposed
flow is implemented.

This publication contains only this plan and the existing
`docs/architecture.excalidraw` edit. Implementation, deployment, and production
verification are separate work.
