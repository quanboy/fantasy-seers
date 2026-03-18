# Fantasy Seers — CLAUDE.md

Do not add Co-Authored-By or any Claude attribution to commit messages.

Fantasy Seers is a social sports prediction platform where users wager points on yes/no propositions (props). Users are rewarded for going against the crowd. Built with React + Vite (frontend) and Spring Boot 3 + PostgreSQL (backend), containerized with Docker Compose. Includes an AI-powered research assistant that converts natural language questions into SQL queries via the Anthropic API.

---

## Architecture Rules

### Layering — strictly enforced
- Controllers → Services → Repositories. No skipping layers.
- Controllers handle HTTP only: parse request, call one service, return response.
- Services own all business logic. No raw SQL. No HTTP concerns.
- Repositories handle data access only. No business logic.
- Never call a Repository directly from a Controller.
- Never put an Anthropic API call anywhere except AnthropicService.

### Single responsibility
- One service per feature domain. Do not add new methods to an existing service if they belong to a different domain.
- If a method exceeds 30 lines, flag it and suggest splitting before proceeding.
- DTOs are for transport only. Never add business logic to a DTO.

### Naming conventions
- Controllers: `XController`
- Services: `XService`
- Repositories: `XRepository`
- Request DTOs: `XRequest`
- Response DTOs: `XResponse`
- Exceptions: `XException`

---

## Project Structure

```
fantasy-seers/
├── docker-compose.yml
├── .env                         # ANTHROPIC_API_KEY (gitignored)
├── backend/                     # Spring Boot 3.2.3 / Java 21 / Maven
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/fantasyseers/api/
│       ├── config/              # Spring config (AppConfig, SecurityConfig, GlobalExceptionHandler, ReadOnlyDataSourceConfig)
│       ├── dto/                 # Request/response records (incl. PagedResponse<T> generic wrapper)
│       ├── controller/          # REST controllers
│       ├── entity/              # JPA entities
│       ├── repository/          # Spring Data repositories
│       ├── security/            # JWT filter + utils, RateLimitFilter, TokenBlacklistService
│       └── service/             # Business logic (incl. AnthropicService, SchemaContextService, SqlValidatorService, RateLimitService)
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/        # Flyway SQL migrations (V1–V10)
├── frontend/                    # React 18 + Vite 5 + Tailwind CSS 3
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx             # Router setup + AuthContext + PrivateRoute/AdminRoute
│       ├── api/client.js        # Axios instance + API methods (propsApi, groupsApi, adminApi, researchApi)
│       ├── context/AuthContext.jsx
│       ├── components/          # AppLayout, Sidebar, PropCard, SubmitPropCard, VoteModal
│       └── pages/               # Login, Register, Dashboard, AdminDashboard, GroupsPage,
│                                # GroupFeedPage, GroupSettingsPage, ProfilePage, MasterSheetPage,
│                                # LeaderboardPage, ResearchPage
└── scripts/                     # seed-players.js, seed-research-test-data.sql
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
| AI        | Anthropic API (Claude Sonnet), read-only SQL generation       |
| Frontend  | React 18, React Router v6, Axios, Tailwind CSS               |
| Build     | Maven (backend), Vite (frontend), Docker Compose             |

---

## Key Configuration

### application.yml (backend)
- `spring.jpa.hibernate.ddl-auto: validate` — schema managed entirely by Flyway, **never** use `create` or `update`
- `spring.flyway.locations: classpath:db/migration`
- JWT secret read from `JWT_SECRET` env var (default dev value in yml)
- JWT expiry: 24h (`JWT_EXPIRATION_MS: 86400000`)
- `anthropic.api-key` read from `ANTHROPIC_API_KEY` env var
- `readonly.datasource.*` — second DataSource for AI-generated SQL queries (falls back to primary credentials in dev)

### vite.config.js (frontend)
- Dev server: port 5173
- `/api` proxy → `http://localhost:8080` by default (local dev); override with `VITE_API_TARGET` env var for Docker

### docker-compose.yml environment variables
```
POSTGRES_DB=fantasyseers_db
POSTGRES_USER=fantasyseers
POSTGRES_PASSWORD=fantasyseers_secret
JWT_SECRET=fantasy-seers-super-secret-jwt-key-change-in-production
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
```

### .env file (gitignored)
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

---

## Database Migrations (Flyway)

Migrations live in `backend/src/main/resources/db/migration/` and run automatically on startup.

- **V1__initial_schema.sql** — full schema: users, friend_groups, friend_group_members, props, prop_groups, votes, point_transactions, badges, user_badges, follows
- **V2__add_prop_submission_columns.sql** — added `min_wager` and `max_wager` to props
- **V3__add_group_invites.sql** — `group_invites` table with UNIQUE constraint on `(group_id, invitee_id)` to prevent duplicate invites
- **V4__add_user_profile_fields.sql** — added `favorite_nfl_team` (varchar 50), `favorite_nba_team` (varchar 50), `alma_mater` (varchar 100) as nullable columns on users
- **V5__nfl_players.sql** — `nfl_players` table (sleeper_id, full_name, position, nfl_team, status) + 300 player inserts from Sleeper API
- **V6__user_rankings.sql** — `user_rankings` table with UNIQUE(user_id, player_id) for personalized master sheet rankings
- **V7__consensus_rankings.sql** — `consensus_rankings` table (player_id, overall_rank, positional_rank) + 300 ranked inserts
- **V8__add_adp_to_nfl_players.sql** — added `adp` (int, nullable) column to nfl_players
- **V9__populate_adp.sql** — populated ADP values from Sleeper API search_rank
- **V10__readonly_role_for_chatbot.sql** — `fs_readonly` Postgres role, `users_safe` view (excludes password/email), SELECT grants on all tables for AI research queries
- **V11__add_performance_indexes.sql** — performance indexes on FK columns: `friend_group_members(user_id)`, `prop_groups(group_id)`, `group_invites(group_id, invitee_id, inviter_id)`, `friend_groups(owner_id)`, `props(created_by)`, `nfl_players(position)`
- **V12__rate_limit_table.sql** — `rate_limit_log` table for DB-backed per-user rate limiting (replaces in-memory ConcurrentHashMap)

**Adding a new migration:** Create `V13__description.sql` in snake_case. Do not modify existing migration files. Never drop or alter a column without confirming it is unused. All new tables need `created_at TIMESTAMPTZ DEFAULT now()`.

---

## API Overview

All endpoints are prefixed `/api` and return JSON.

| Controller         | Prefix           | Key Endpoints                                                                 |
|--------------------|------------------|-------------------------------------------------------------------------------|
| AuthController     | `/api/auth`      | `POST /register`, `POST /login`, `POST /logout`                               |
| UserController     | `/api/users`     | `GET /me`, `PUT /me` (update profile), `GET /me/authorities`                  |
| PropController     | `/api/props`     | `POST /submit` (user), `GET /public` (all, legacy), `GET /public/paged?status=OPEN&page=0&size=20` (paginated by status), `GET /{id}` |
| VoteController     | `/api/props`     | `POST /{id}/vote`, `GET /{id}/split`                                         |
| AdminController    | `/api/admin`     | `GET /props/pending`, `GET /props/closed`, `POST /props/{id}/approve`, `POST /props/{id}/reject`, `POST /props/{id}/resolve?result=YES\|NO`, `POST /props` (create with optional groupId), `GET /groups` (all groups) |
| LeaderboardController | `/api/leaderboard` | `GET /global` (public, no auth), `GET /group/{groupId}` (auth + membership required) |
| FriendGroupController | `/api/groups` | `POST /` (create), `POST /join` (invite code), `GET /` (my groups), `GET /{id}`, `GET /{id}/props` (all, legacy), `GET /{id}/props/paged?status=OPEN&page=0&size=20` (paginated by status), `PATCH /{id}` (rename, owner), `DELETE /{id}/members/{userId}` (kick, owner), `DELETE /{id}/members/me` (leave), `POST /{id}/invite`, `GET /invites`, `POST /invites/{inviteId}/accept`, `POST /invites/{inviteId}/reject` |
| RankingsController | `/api/rankings` | `GET /my-sheet` (auth, returns user's master sheet or consensus fallback), `POST /my-sheet` (auth, save rankings) |
| ResearchController | `/api/research`  | `POST /` (auth, natural language → SQL → plain English answer, rate limited 20/hr per user) |

### API rules
- All endpoints except `/api/auth/**`, `/api/props/public`, and `/api/leaderboard/global` require a valid JWT
- Return 400 for validation errors, 401 for auth failures, 403 for permission errors, 409 for business rule conflicts, 429 for rate limit breaches
- Never expose stack traces or internal error messages to the client

---

## Current Feature Map

| Feature      | Controller              | Service              | Repository              |
|--------------|-------------------------|----------------------|-------------------------|
| Auth         | AuthController          | AuthService          | UserRepository          |
| Props        | PropController          | PropService          | PropRepository          |
| Votes        | VoteController          | VoteService          | VoteRepository          |
| Groups       | FriendGroupController   | FriendGroupService   | FriendGroupRepository   |
| Leaderboard  | LeaderboardController   | LeaderboardService   | VoteRepository          |
| Rankings     | RankingsController      | RankingsService      | UserRankingRepository, ConsensusRankingRepository |
| Resolution   | AdminController         | ResolutionService    | PropRepository, VoteRepository |
| Research     | ResearchController      | AnthropicService, SchemaContextService, SqlValidatorService, RateLimitService | (read-only JdbcTemplate), RateLimitRepository |

---

## Research Feature — specific rules

### What ResearchController is allowed to do
- Call SchemaContextService to get the system prompt
- Call AnthropicService to generate SQL and format results
- Call SqlValidatorService to validate generated SQL
- Execute validated SQL via the read-only JdbcTemplate
- Call RateLimitService to check and record per-user rate limits (20 requests/hour, DB-backed via `rate_limit_log` table)

### What ResearchController is NOT allowed to do
- Call any Repository bean
- Write to the database
- Construct HTTP requests directly
- Know anything about the JWT or the authenticated user beyond the username

### AnthropicService rules
- The only class in the project that may call the Anthropic API
- Two methods only: `generateSql()` and `formatResults()`
- No business logic — it sends prompts and returns strings

### SqlValidatorService rules
- The only class that may inspect or approve a SQL string
- Must reject anything that is not a pure SELECT statement
- Must confirm a LIMIT clause is present
- Throws `UnsafeSqlException` on any violation
- No knowledge of HTTP, Anthropic, or the database

### Read-only DataSource
- The research feature executes queries via a separate read-only Postgres role (`fs_readonly`)
- This DataSource is `@Lazy`-initialized (created after Flyway migrations run)
- Must never be injected into any service outside of ResearchController
- Falls back to primary DB credentials in dev when `READONLY_DB_USERNAME` is not set

### SchemaContextService rules
- Returns the system prompt string describing the full database schema
- Includes reference data (team abbreviations, enum values) so Claude generates correct SQL
- Must be updated when new tables are added to the schema

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
| `/master-sheet`| MasterSheetPage | PrivateRoute |
| `/research`   | ResearchPage    | PrivateRoute |
| `/leaderboard`| LeaderboardPage | PrivateRoute |
| `/profile`    | ProfilePage     | PrivateRoute |
| `/admin`      | AdminDashboard  | AdminRoute   |

- **PrivateRoute** — redirects unauthenticated users to `/login`
- **AdminRoute** — redirects non-ADMIN users to `/`
- **AuthContext** — stores user + JWT in localStorage, provides `login`/`logout` (logout calls backend to blacklist token)

### Frontend API Client (`client.js`)
Exports namespaced API helpers: `authApi`, `propsApi`, `groupsApi`, `adminApi`, `leaderboardApi`, `rankingsApi`, `researchApi`, `userApi`. Each wraps Axios calls to `/api/*`.

### Layout Architecture
- **AppLayout** — shared layout wrapper for all authenticated pages. Renders the `Sidebar` and a top navigation bar with username, point bank, and sign out. Uses React Router `<Outlet />` for nested routes. Individual pages no longer have their own navbars.
- **Sidebar** — persistent left sidebar (desktop) / slide-in drawer (mobile). Nav items: Dashboard, Master Sheet, Leagues, Leaderboard, Trends, Research, Profile, Admin Uploads (admin-only). Shows logo, nav links with active state via `NavLink`, and user avatar footer pinned to bottom.
- Mobile top bar shows hamburger + logo on the left; username, points, and sign out on the right.

### Key UI Patterns
- **SubmitPropCard** — expandable form; dynamically shows group selector when scope is `GROUP` or `FRIENDS_AND_GROUP`. Fetches user's groups on expand.
- **PropCard** — unified card with 7 visual states sharing a consistent layout: left accent bar (3px, color by state), state-tinted border, sport badge top-left, vote chips or timer top-right, title in Cinzel, divider, and bottom row (status pill left, value right). States:
  - **Open unvoted:** gold accent bar, amber dot + "X days left" timer, inline Yes/No buttons + wager input (with min/max range), "Open" pill, no duplicate value on bottom-right
  - **Open voted:** gold accent bar, vote chips (active=filled, inactive=ghost at 40% opacity), split bar with yes%/no%, contrarian payout hint if majority, "Open · X days left" pill, "X pts wagered" right
  - **Closed voted:** muted accent bar, vote chips, split bar, contrarian hint with minority phrasing, "Closed · resolving soon" pill, "X pts wagered" right
  - **Resolved unvoted:** muted accent bar, card-closed border, "Resolved" text top-right, muted title, "Resolved" pill bottom-left. No vote buttons or split bar shown.
  - **Resolved correct:** green accent bar, vote chips, split bar, "Correct" pill (chip-win), "+X pts" in gold right
  - **Resolved contrarian:** green accent bar, "Correct · contrarian" pill, "+X pts" in gold
  - **Resolved incorrect:** red accent bar, vote chips, split bar, "Incorrect" pill (chip-loss), "−X pts" strikethrough right
  - Prop description (context) is shown below the title when present, in muted text. Split bar has a "Voting Splits" header. Clicking Yes/No opens VoteModal pre-filled via `_initialChoice`/`_initialWager` props. Split data fetched via `propsApi.getSplit()` for all voted states. Payout delta from `userWager`/`userPayout` fields in PropResponse DTO.
- **VoteModal** — reused on Dashboard and GroupFeedPage for casting votes. Accepts `_initialChoice` and `_initialWager` from PropCard to pre-fill the form.
- **LeaderboardPage** — global and per-group leaderboard with tabs. Shows rank, username, picks, correct, accuracy %. Top 3 get medal colors. Current user's row is highlighted. Fetches groups for tab switcher.
- **Dashboard** — shows props in three sections: Public Props (open/live), Closed (awaiting results), and Resolved (settled). Each section fetches independently via paginated API (`/props/public/paged?status=X`) with "Load More" button. Refreshes pointBank every 30s and re-fetches all sections after voting. Shows a dismissible profile completion banner if all identity fields (NFL team, NBA team, alma mater) are null. Closed and Resolved sections only appear when they have props.
- **ProfilePage** — view/edit profile. Read-only Account section (username, email, plus current team/alma mater values) and editable Identity section (NFL team dropdown, NBA team dropdown, alma mater text input). Uses `PUT /api/users/me`.
- **GroupsPage** — create/join forms + group list with clickable invite codes (copy to clipboard). Shows "Pending Invites" section with accept/reject buttons when the user has pending group invites.
- **GroupFeedPage** — group header (with Settings link) + "Invite Member" form (username input) + group-scoped props in three paginated sections (open/closed/resolved) via `/groups/{id}/props/paged?status=X` with "Load More" button.
- **GroupSettingsPage** — group management page: rename group (owner only), member list with kick buttons (owner only), leave group (all members, auto-transfers ownership if owner leaves). Accessible via `/groups/:id/settings`.
- **MasterSheetPage** — personalized NFL player ranking sheet. Pre-populated with consensus expert rankings (from Sleeper API search_rank). Users drag-and-drop to reorder via @dnd-kit. Columns: Rank, Player Name (Team), Position (positional rank chip), ADP. Position filter bar with multi-select pill toggles (ALL, QB, RB, WR, TE, K, DEF). Dragging recalculates both overall and positional ranks. Save button persists to `user_rankings` table. Falls back to `consensus_rankings` if user has no saved sheet (`isDefault: true`).
- **ResearchPage** — AI-powered chat interface for querying app data in natural language. Chat thread with user/assistant message bubbles. Suggested starter questions on empty state. Loading dots animation. Expandable "Show SQL" section on each answer for debugging. Handles 429 rate limit and error states. Uses `researchApi.ask()`.
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
- **NflPlayer** — NFL player sourced from Sleeper API. Fields: sleeperId (unique), fullName, position (QB/RB/WR/TE/K/DEF), nflTeam, status, adp (Average Draft Position from Sleeper search_rank). 300 players seeded via `scripts/seed-players.js`.
- **ConsensusRanking** — expert consensus ranking for each NflPlayer. OneToOne with NflPlayer. Fields: overallRank, positionalRank. Seeded from Sleeper API search_rank ordering.
- **UserRanking** — user's personalized ranking for an NflPlayer. ManyToOne User + ManyToOne NflPlayer. Fields: overallRank, positionalRank, updatedAt. UNIQUE(user_id, player_id). If no UserRankings exist for a user, the API falls back to ConsensusRankings.
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
| `UnsafeSqlException`       | 400 Bad Request | "Forbidden keyword: DROP", "Only SELECT queries are allowed" |

Frontend components read error messages via `err.response?.data?.message` in catch blocks.

**Axios interceptor** (`client.js`): Only redirects to `/login` on 401 or on 403 when no token exists in localStorage. Auth routes (`/auth/*`) are excluded from the interceptor redirect — login/register 403s propagate to component error handlers so they can display error messages. Authenticated 403s (permission errors) also propagate to component error handlers. Shows a "Session expired" toast before redirect on 401.

---

## Security Notes

- JWT is validated in `JwtAuthFilter` (extends `OncePerRequestFilter`). Token extraction is wrapped in try/catch for `JwtException` to prevent malformed tokens from bubbling up.
- **Token blacklisting:** `TokenBlacklistService` maintains an in-memory blacklist of revoked tokens. `POST /api/auth/logout` adds the token to the blacklist. `JwtAuthFilter` checks the blacklist before validating. Expired entries are purged every 10 minutes.
- **Rate limiting:** `RateLimitFilter` limits auth endpoints (`/api/auth/*`) to 10 requests per minute per IP. `RateLimitService` (DB-backed via `rate_limit_log` table) limits research queries to 20 per hour per user — survives restarts and works across multiple instances.
- `@PreAuthorize("hasRole('ADMIN')")` guards all admin endpoints.
- `AccessDeniedException` from `org.springframework.security.access` returns 403 via `GlobalExceptionHandler`.
- `@EnableJpaAuditing` is on `AppConfig`, not the main application class.
- Group endpoints verify membership before returning data (e.g., `getGroupById`, `getGroupProps`). Owner-only actions (rename, kick) check `group.getOwner()` match.
- **Wager limits** are enforced server-side in `VoteService.castVote()` — rejects wagers outside `minWager`/`maxWager` bounds. Frontend `VoteModal` also validates client-side.
- **Pessimistic locking** — `VoteService.castVote()` acquires `PESSIMISTIC_WRITE` on the User row via `findByUsernameForUpdate()` to prevent concurrent point deduction races. `ResolutionService.resolveProp()` acquires `PESSIMISTIC_WRITE` on the Prop row via `findByIdForUpdate()` to prevent double resolution. Point updates use atomic SQL (`UPDATE ... SET point_bank = point_bank + :amount`) instead of read-modify-write.
- **Input sanitization:** HTML tags stripped from prop title/description in `PropService`. Length limits enforced via `@Size` on DTOs.
- **Integer overflow protection:** Payout calculations in `ResolutionService` use `long` arithmetic and cap at `Integer.MAX_VALUE`.
- **Read-only DataSource:** AI-generated SQL runs against the `fs_readonly` Postgres role which has SELECT-only permissions. `users_safe` view excludes password and email columns.

---

## Scalability Patterns

### Atomic point updates
`UserRepository.adjustPointBank(id, amount)` uses a single `UPDATE ... SET point_bank = point_bank + :amount` statement. All point mutations (wager deductions in `VoteService`, payout credits in `ResolutionService`) go through this method. Never use read-modify-write on `pointBank`.

### Batch saves
`ResolutionService` collects all vote payout mutations and calls `voteRepository.saveAll(allVotes)` once per resolution instead of saving each vote individually.

### Bulk scheduler updates
`PropClosingScheduler` uses `propRepository.bulkCloseExpiredProps()` — a single `@Modifying @Query` UPDATE statement — instead of loading all expired props into memory.

### Eager fetching via @EntityGraph
- `FriendGroupRepository.findAllByMemberUsername()` — eagerly fetches `owner` and `members`
- `GroupInviteRepository.findAllByInviteeUsernameAndStatus()` — eagerly fetches `group` and `inviter`

### Paginated prop endpoints
Props are paginated by status via dedicated `/paged` endpoints. Default page size: 20. Dashboard and GroupFeedPage each fetch OPEN/CLOSED/RESOLVED sections independently with "Load More". The old unpaginated endpoints (`/props/public`, `/groups/{id}/props`) remain for backward compatibility.

### DB-backed rate limiting
`RateLimitService` + `RateLimitRepository` + `rate_limit_log` table. Counts requests per user per endpoint within a time window. Used by `ResearchController` (20 req/hr). Reusable for any endpoint.

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
- **ReadOnlyDataSourceConfig is `@Lazy`** — the read-only DataSource is lazily initialized because the `fs_readonly` Postgres role is created by a Flyway migration that must run first via the primary DataSource.

---

## What to do before writing any new code
1. Read the existing service or controller for the relevant feature
2. Describe the pattern it follows
3. Implement the new code using the same pattern
4. If the task requires modifying more than one layer, confirm the plan first

## What to do after writing any new code
1. Check that no controller calls a repository directly
2. Check that no service contains HTTP-specific logic
3. Check that no Anthropic API call exists outside AnthropicService
4. Flag any method over 30 lines for review

---

## Do not do these things
- Do not create utility classes that mix unrelated responsibilities
- Do not add static helper methods to entity classes
- Do not generate code without reading the existing pattern first
- Do not silently add dependencies to pom.xml — flag them and explain why
- Do not generate a Flyway migration that drops or renames a column without asking
- Do not add TODO comments — either implement it or leave it out
