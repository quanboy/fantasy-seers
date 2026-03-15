# Fantasy Seers — CLAUDE.md

Do not add Co-Authored-By or any Claude attribution to commit messages.

Fantasy Seers is a social sports prediction platform where users wager points on yes/no propositions (props). Users are rewarded for going against the crowd. Built with React + Vite (frontend) and Spring Boot 3 + PostgreSQL (backend), containerized with Docker Compose.

---

## Project Structure

```
fantasy-seers/
├── docker-compose.yml
├── backend/                     # Spring Boot 3.2.3 / Java 21 / Maven
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/fantasyseers/api/
│       ├── config/              # Spring config (AppConfig, SecurityConfig, GlobalExceptionHandler)
│       ├── controller/          # REST controllers
│       ├── dto/                 # Request/response records
│       ├── entity/              # JPA entities
│       ├── repository/          # Spring Data repositories
│       ├── security/            # JWT filter + utils
│       └── service/             # Business logic
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/        # Flyway SQL migrations (V1, V2, V3, V4)
└── frontend/                    # React 18 + Vite 5 + Tailwind CSS 3
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx             # Router setup + AuthContext + PrivateRoute/AdminRoute
        ├── api/client.js        # Axios instance + API methods (propsApi, groupsApi, adminApi)
        ├── context/AuthContext.jsx
        ├── components/          # AppLayout, Sidebar, PropCard, SubmitPropCard, VoteModal
        └── pages/               # Login, Register, Dashboard, AdminDashboard,
                                 # GroupsPage, GroupFeedPage, GroupSettingsPage, ProfilePage
```

---

## Running the Project

### Docker (recommended)
```bash
docker-compose up --build       # Start all services
docker-compose down             # Stop
docker-compose logs -f backend  # Stream backend logs
```

### Local (without Docker)
```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend
cd frontend && npm install && npm run dev
```

### Service URLs
| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:5173  |
| Backend  | http://localhost:8080  |
| Postgres | localhost:5432         |

---

## Tech Stack

| Layer     | Tech                                                         |
|-----------|--------------------------------------------------------------|
| Backend   | Spring Boot 3.2.3, Java 21, Spring Security 6, Spring Data JPA |
| Auth      | JWT (JJWT 0.12.5), stateless, stored in localStorage         |
| Database  | PostgreSQL 15, Flyway migrations, Hibernate ORM              |
| Frontend  | React 18, React Router v6, Axios, Tailwind CSS               |
| Build     | Maven (backend), Vite (frontend), Docker Compose             |

---

## Key Configuration

### application.yml (backend)
- `spring.jpa.hibernate.ddl-auto: validate` — schema managed entirely by Flyway, **never** use `create` or `update`
- `spring.flyway.locations: classpath:db/migration`
- JWT secret read from `JWT_SECRET` env var (default dev value in yml)
- JWT expiry: 24h (`JWT_EXPIRATION_MS: 86400000`)

### vite.config.js (frontend)
- Dev server: port 5173
- `/api` proxy → `http://localhost:8080` by default (local dev); override with `VITE_API_TARGET` env var for Docker

### docker-compose.yml environment variables
```
POSTGRES_DB=fantasyseers_db
POSTGRES_USER=fantasyseers
POSTGRES_PASSWORD=fantasyseers_secret
JWT_SECRET=fantasy-seers-super-secret-jwt-key-change-in-production
```

---

## Database Migrations (Flyway)

Migrations live in `backend/src/main/resources/db/migration/` and run automatically on startup.

- **V1__initial_schema.sql** — full schema: users, friend_groups, friend_group_members, props, prop_groups, votes, point_transactions, badges, user_badges, follows
- **V2__add_prop_submission_columns.sql** — added `min_wager` and `max_wager` to props
- **V3__add_group_invites.sql** — `group_invites` table with UNIQUE constraint on `(group_id, invitee_id)` to prevent duplicate invites
- **V4__add_user_profile_fields.sql** — added `favorite_nfl_team` (varchar 50), `favorite_nba_team` (varchar 50), `alma_mater` (varchar 100) as nullable columns on users

**Adding a new migration:** Create `V5__description.sql`. Do not modify existing migration files.

---

## API Overview

All endpoints are prefixed `/api` and return JSON.

| Controller         | Prefix           | Key Endpoints                                                                 |
|--------------------|------------------|-------------------------------------------------------------------------------|
| AuthController     | `/api/auth`      | `POST /register`, `POST /login`                                               |
| UserController     | `/api/users`     | `GET /me`, `PUT /me` (update profile), `GET /me/authorities`                  |
| PropController     | `/api/props`     | `POST /submit` (user), `GET /public`, `GET /{id}`                            |
| VoteController     | `/api/props`     | `POST /{id}/vote`, `GET /{id}/split`                                         |
| AdminController    | `/api/admin`     | `GET /props/pending`, `GET /props/closed`, `POST /props/{id}/approve`, `POST /props/{id}/reject`, `POST /props/{id}/resolve?result=YES\|NO`, `POST /props` (create with optional groupId), `GET /groups` (all groups) |
| LeaderboardController | `/api/leaderboard` | `GET /global` (public, no auth), `GET /group/{groupId}` (auth + membership required) |
| FriendGroupController | `/api/groups` | `POST /` (create), `POST /join` (invite code), `GET /` (my groups), `GET /{id}`, `GET /{id}/props`, `PATCH /{id}` (rename, owner), `DELETE /{id}/members/{userId}` (kick, owner), `DELETE /{id}/members/me` (leave), `POST /{id}/invite`, `GET /invites`, `POST /invites/{inviteId}/accept`, `POST /invites/{inviteId}/reject` |

---

## Frontend Routing

Defined in `src/main.jsx` using React Router v6.

| Path          | Component       | Guard        |
|---------------|-----------------|--------------|
| `/login`      | Login           | public       |
| `/register`   | Register        | public       |
| `/`           | Dashboard       | PrivateRoute |
| `/groups`     | GroupsPage      | PrivateRoute |
| `/groups/:id` | GroupFeedPage   | PrivateRoute |
| `/groups/:id/settings` | GroupSettingsPage | PrivateRoute |
| `/leaderboard`| LeaderboardPage | PrivateRoute |
| `/profile`    | ProfilePage     | PrivateRoute |
| `/admin`      | AdminDashboard  | AdminRoute   |

- **PrivateRoute** — redirects unauthenticated users to `/login`
- **AdminRoute** — redirects non-ADMIN users to `/`
- **AuthContext** — stores user + JWT in localStorage, provides `login`/`logout`

### Frontend API Client (`client.js`)
Exports namespaced API helpers: `authApi`, `propsApi`, `groupsApi`, `adminApi`, `leaderboardApi`, `userApi`. Each wraps Axios calls to `/api/*`.

### Layout Architecture
- **AppLayout** — shared layout wrapper for all authenticated pages. Renders the `Sidebar` and a top navigation bar with username, point bank, and sign out. Uses React Router `<Outlet />` for nested routes. Individual pages no longer have their own navbars.
- **Sidebar** — persistent left sidebar (desktop) / slide-in drawer (mobile). Nav items: Dashboard, Leagues, Leaderboard, Trends, Profile, Admin Uploads (admin-only). Shows logo, nav links with active state via `NavLink`, and user avatar footer pinned to bottom.
- Mobile top bar shows hamburger + logo on the left; username, points, and sign out on the right.

### Key UI Patterns
- **SubmitPropCard** — expandable form; dynamically shows group selector when scope is `GROUP` or `FRIENDS_AND_GROUP`. Fetches user's groups on expand.
- **PropCard** — unified card with 6 visual states sharing a consistent layout: left accent bar (3px, color by state), state-tinted border, sport badge top-left, vote chips or timer top-right, title in Cinzel, divider, and bottom row (status pill left, value right). States:
  - **Open unvoted:** gold accent bar, amber dot + "X days left" timer, inline Yes/No buttons + wager input, "Open" pill, wager range right
  - **Open voted:** gold accent bar, vote chips (active=filled, inactive=ghost at 40% opacity), split bar with yes%/no%, contrarian payout hint if majority, "Open · X days left" pill, "X pts wagered" right
  - **Closed voted:** muted accent bar, vote chips, split bar, contrarian hint with minority phrasing, "Closed · resolving soon" pill, "X pts wagered" right
  - **Resolved correct:** green accent bar, vote chips, split bar, "Correct" pill (chip-win), "+X pts" in gold right
  - **Resolved contrarian:** green accent bar, "Correct · contrarian" pill, "+X pts" in gold
  - **Resolved incorrect:** red accent bar, vote chips, split bar, "Incorrect" pill (chip-loss), "−X pts" strikethrough right
  - Clicking Yes/No opens VoteModal pre-filled via `_initialChoice`/`_initialWager` props. Split data fetched via `propsApi.getSplit()` for all voted states. Payout delta from `userWager`/`userPayout` fields in PropResponse DTO.
- **VoteModal** — reused on Dashboard and GroupFeedPage for casting votes. Accepts `_initialChoice` and `_initialWager` from PropCard to pre-fill the form.
- **LeaderboardPage** — global and per-group leaderboard with tabs. Shows rank, username, picks, correct, accuracy %. Top 3 get medal colors. Current user's row is highlighted. Fetches groups for tab switcher.
- **Dashboard** — shows Public Props and Resolved props in separate sections; refreshes pointBank every 30s and re-fetches props after voting. Shows a dismissible profile completion banner if all identity fields (NFL team, NBA team, alma mater) are null.
- **ProfilePage** — view/edit profile. Read-only Account section (username, email, plus current team/alma mater values) and editable Identity section (NFL team dropdown, NBA team dropdown, alma mater text input). Uses `PUT /api/users/me`.
- **GroupsPage** — create/join forms + group list with clickable invite codes (copy to clipboard). Shows "Pending Invites" section with accept/reject buttons when the user has pending group invites.
- **GroupFeedPage** — group header (with Settings link) + "Invite Member" form (username input) + group-scoped props (open/closed/resolved sections).
- **GroupSettingsPage** — group management page: rename group (owner only), member list with kick buttons (owner only), leave group (all members, auto-transfers ownership if owner leaves). Accessible via `/groups/:id/settings`.
- **AdminDashboard** — pending props queue (approve/reject) + "Create Prop" form with optional group assignment dropdown + "Resolve Props" section showing closed props with YES/NO resolve buttons.

### Theme & Design Tokens

**Dark mode UI.** The app uses a dark color scheme with navy-blue backgrounds, light text, and muted accents. All colors are defined in `tailwind.config.js` under `theme.extend.colors`. Use Tailwind classes with these tokens or the CSS component classes from `index.css`. Chips and card-border classes use raw `rgba()` in `index.css` because `@apply` doesn't support Tailwind opacity modifiers.

| Token    | Purpose                                  |
|----------|------------------------------------------|
| `void`   | Dark backgrounds (950 `#0C0F1A` – 600 `#3A4259`) |
| `oracle` | Primary purple / brand — use sparingly: primary buttons, nav active state, links only (900–100) |
| `gold`   | Points, rewards, admin accents (600–200) |
| `win`    | Success / YES votes (900–300)            |
| `loss`   | Failure / NO votes (900–400)             |
| `live`   | Live indicator orange (flat)             |

**Text color scale for dark mode:**
- Headings: `text-slate-100`
- Body text / names: `text-slate-200`
- Secondary text: `text-slate-300` or `text-slate-400`
- Muted / labels: `text-slate-500`
- Semantic colors: use `400` variants (e.g., `text-win-400`, `text-loss-400`, `text-oracle-400`, `text-gold-400`) — never `700` variants, those are for light backgrounds

**Typography:** `font-display` (Syne) for headings, `font-cinzel` (Cinzel) for brand titles and section headers (Fantasy Seers, Public Props, Resolved, Closed), `font-body` (Inter) for body text.

**Border radius:** `rounded-xl` (12px) for cards/containers, `rounded-lg` (8px) for buttons/inputs/chips/alerts.

**Shadows:** Flat design — no colored glows. Only `shadow-card` (subtle) and `shadow-modal` (for overlays). Card hover uses border-color change only, no lift or glow.

**CSS component classes** (defined in `index.css`, use instead of inline styles):
- **Layout:** `.glass-card`, `.glass-card-hover`, `.glass-nav`
- **Chips:** `.chip-oracle`, `.chip-oracle-active`, `.chip-gold`, `.chip-gold-strong`, `.chip-win`, `.chip-loss`
- **Buttons:** `.btn-oracle`, `.btn-gold`, `.btn-ghost`, `.btn-approve`, `.btn-reject`
- **Alerts:** `.alert-error`
- **Cards:** `.card-open`, `.card-closed`, `.card-win`, `.card-loss`, `.card-pending-border`
- **Accent bars:** `.accent-bar-gold`, `.accent-bar-muted`, `.accent-bar-win`, `.accent-bar-loss`
- **Status pills:** `.chip-open`, `.chip-closed`, `.chip-vote-ghost`
- **Vote UI:** `.vote-yes`, `.vote-yes-idle`, `.vote-no`, `.vote-no-idle`, `.bar-yes`, `.bar-no`
- **Other:** `.input-base`, `.rake-chip`, `.skeleton`, `.sport-*` badges, `.live-dot`

For error text, use `text-loss-400` (not `text-red-400`). For backgrounds with opacity, use Tailwind's `/` modifier in markup (e.g., `bg-oracle-500/10`) but in `@apply` or CSS use `theme('colors.oracle.500 / 0.1')` or raw `rgba()` instead.

---

## Domain Model

- **Prop** — a yes/no proposition with `minWager`/`maxWager` limits. Scopes: `PUBLIC`, `FRIENDS`, `GROUP`, `FRIENDS_AND_GROUP`. Statuses: `PENDING` → `OPEN` → `CLOSED` → `RESOLVED`. Has `isAdminProp` flag to distinguish admin-created vs user-submitted props.
- **Vote** — a user's YES/NO choice on a prop with a wager amount. One vote per user per prop.
- **FriendGroup** — a named group with an 8-char uppercase invite code. Owner is auto-member. Members accessed via lazy-loaded `Set<User>`. Users can join via invite code or be invited by username. Owner can rename, kick members. Any member can leave; if the owner leaves, ownership auto-transfers to the alphabetically first remaining member. If the last member leaves, the group is deleted.
- **GroupInvite** — a pending/accepted/rejected invite for a user to join a group. Statuses: `PENDING` → `ACCEPTED` or `REJECTED`. UNIQUE constraint on `(group_id, invitee_id)` prevents duplicate invites. Only group members can send invites. Accepting adds the invitee to the group's member set.
- **User** — roles: `USER` or `ADMIN`. Starts with 1000 `pointBank`. Optional profile fields: `favoriteNflTeam`, `favoriteNbaTeam`, `almaMater`. Tier system: Rookie (0–4999), Pro (5000–14999), Elite (15000–49999), Legend (50000+).
- **Prop lifecycle:**
  - **User-submitted:** `PENDING` → admin approval → `OPEN` → `CLOSED` → `RESOLVED`
  - **Admin-created:** `OPEN` → `CLOSED` → `RESOLVED` (skips PENDING)
  - **Auto-close:** `PropClosingScheduler` (`@Scheduled`, runs every 60s) automatically moves OPEN props to CLOSED when `closesAt` has passed. `@EnableScheduling` is on `FantasySeersApplication`.
  - **Resolve guard:** `ResolutionService` only accepts CLOSED props for resolution (rejects OPEN/PENDING). `VoteService` also checks `closesAt` as an extra safeguard.
  - **Admin resolve flow:** Admin sees closed props in "Resolve Props" section on AdminDashboard, clicks YES or NO to resolve, triggers payout calculation.
- **Leaderboard:** Accuracy Score = correct picks / total resolved picks (%). Computed at query time from votes + props tables via JPQL in `VoteRepository`. Global leaderboard is public (no auth). Group leaderboard requires membership. Sorted by accuracy desc, then total picks desc.
- **Prop scoping:** Props can be scoped to groups via the `prop_groups` join table (ManyToMany). `PropRepository.findVisibleToUser()` handles visibility filtering based on scope and group membership. Admin-created props can optionally be assigned to a group (sets scope to GROUP).

---

## Error Handling

`GlobalExceptionHandler` (`@RestControllerAdvice` in `config/`) catches service-layer exceptions and returns JSON `{"message": "..."}`:

| Exception                  | HTTP Status   | Examples                                          |
|----------------------------|---------------|---------------------------------------------------|
| `IllegalArgumentException` | 400 Bad Request | "Invalid invite code", "Prop not found"          |
| `IllegalStateException`    | 409 Conflict   | "Already a member", "Already voted", "Insufficient points", "Invite already sent" |
| `AccessDeniedException`    | 403 Forbidden  | "Not a member of this group", "Only the group owner can rename/kick" |

Frontend components read error messages via `err.response?.data?.message` in catch blocks.

**Axios interceptor** (`client.js`): Only redirects to `/login` on 401 or on 403 when no token exists in localStorage. Auth routes (`/auth/*`) are excluded from the interceptor redirect — login/register 403s propagate to component error handlers so they can display error messages. Authenticated 403s (permission errors) also propagate to component error handlers.

---

## Security Notes

- JWT is validated in `JwtAuthFilter` (extends `OncePerRequestFilter`). Token extraction is wrapped in try/catch for `JwtException` to prevent malformed tokens from bubbling up.
- `@PreAuthorize("hasRole('ADMIN')")` guards all admin endpoints.
- `AccessDeniedException` from `org.springframework.security.access` returns 403 via `GlobalExceptionHandler`.
- `@EnableJpaAuditing` is on `AppConfig`, not the main application class.
- Group endpoints verify membership before returning data (e.g., `getGroupById`, `getGroupProps`). Owner-only actions (rename, kick) check `group.getOwner()` match.
- **Wager limits** are enforced server-side in `VoteService.castVote()` — rejects wagers outside `minWager`/`maxWager` bounds. Frontend `VoteModal` also validates client-side.

---

## Common Gotchas

- **JPQL, not SQL** — queries in `@Query` use entity/field names, not table/column names. Enum values must be bound as `@Param` parameters, not inline strings.
- **PostgreSQL + `DISTINCT` + `ORDER BY`** — if `ORDER BY` uses an expression not in the `SELECT` list, PostgreSQL rejects it. Prefer `EXISTS` subqueries over `LEFT JOIN` + `DISTINCT` to avoid this.
- **Flyway owns the schema** — never change `ddl-auto` to `create` or `update` in any environment.
- **`@Builder.Default`** — Lombok `@Builder` fields with defaults (e.g., `Set<User> members`) need `@Builder.Default` or the default is ignored when using the builder.
- **`FetchType.LAZY`** — `FriendGroup.members`, `FriendGroup.owner`, and `GroupInvite.group`/`inviter`/`invitee` are lazy-loaded. Access them within a `@Transactional` method or they'll throw `LazyInitializationException`.
- **Two prop creation flows** — `PropService.submitProp()` (user, starts PENDING) vs `PropService.createProp()` (admin, starts OPEN). Both support optional `groupId` to scope props to a group. Don't confuse them.
- **Owner leave auto-transfer** — when the group owner leaves, ownership transfers to the alphabetically first remaining member. If no members remain, the group is deleted. The owner cannot be kicked.
- **Invite codes are case-insensitive** — `FriendGroupService.joinGroup()` uppercases the input before lookup.
- **Group invites have a UNIQUE constraint** — `(group_id, invitee_id)` prevents duplicate invites. The service checks for existing PENDING invites before creating new ones.
- **Invite validation order** — `inviteUser()` checks: inviter is member → invitee exists → invitee not already a member → no pending invite exists. Errors use `IllegalArgumentException` (not found) or `IllegalStateException` (business rule).
- **Spring Security returns 403 for unauthenticated requests** (not 401) — the default filter chain with stateless sessions does this. The Axios interceptor accounts for this by checking whether a token exists in localStorage to distinguish auth failures from permission errors.
- **`@apply` does not support Tailwind opacity modifiers** — `@apply bg-oracle-500/10` fails at build time. Use `background: theme('colors.oracle.500 / 0.1')` in CSS instead. The `/` modifier works fine in JSX `className` strings.
- **Docker frontend duplicate React** — The Docker frontend container can produce "Invalid hook call" errors due to duplicate React instances when volume-mounting `src/`. For local development, prefer running the frontend directly (`cd frontend && npm run dev`) while keeping backend + DB in Docker (`docker-compose up postgres backend`).
- **CORS allows any localhost port** — `SecurityConfig` uses `allowedOriginPatterns("http://localhost:*")` so the Vite dev server works on any port. If Vite picks a non-standard port (5174, 5175, etc.) due to port conflicts, CORS won't block it.
