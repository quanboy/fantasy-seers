# Fantasy Seers — CLAUDE.md

Do not add Co-Authored-By or any Claude attribution to commit messages.

Fantasy Seers is a social sports prediction platform where users wager points on yes/no propositions (props). Users are rewarded for going against the crowd. Built with React + Vite (frontend) and Spring Boot 3 + PostgreSQL (backend), containerized with Docker Compose. Includes Sentry error monitoring for both frontend and backend.

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
│       ├── repository/          # Spring Data repositories (incl. PointTransactionRepository)
│       ├── security/            # JWT filter + utils, RateLimitFilter
│       └── service/             # Business logic
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-prod.yml # Production profile (activate via SPRING_PROFILES_ACTIVE=prod)
│       └── db/migration/        # Flyway SQL migrations (V1–V14)
├── frontend/                    # React 18 + Vite 5 + Tailwind CSS 3
│   ├── package.json
│   ├── Dockerfile               # Multi-stage: npm build → nginx
│   ├── nginx.conf               # Production nginx config (React Router fallback + API proxy)
│   ├── .env.example             # Documents VITE_SENTRY_DSN
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx             # Router setup + AuthContext + Sentry init + ErrorBoundary
│       ├── api/client.js        # Axios instance + API methods
│       ├── context/AuthContext.jsx  # JWT expiry check on load
│       ├── utils/               # Shared constants (sportClasses.js, teams.js)
│       ├── components/          # AppLayout, Sidebar, PropCard, SubmitPropCard, VoteModal
│       └── pages/               # Login, Register, Dashboard, AdminDashboard,
│                                # GroupsPage, GroupFeedPage, GroupSettingsPage, ProfilePage,
│                                # LeaderboardPage
```

---

## Running the Project

### Docker (recommended)
```bash
docker-compose up --build       # Start all services (frontend on port 80, backend on 8080)
docker-compose down             # Stop
docker-compose logs -f backend  # Stream backend logs
```

### Local (without Docker)
```bash
# Backend
cd backend && mvn spring-boot:run

# Frontend (dev server with hot reload)
cd frontend && npm install && npm run dev
```

### Service URLs
| Service  | Docker               | Local Dev            |
|----------|----------------------|----------------------|
| Frontend | http://localhost      | http://localhost:5173 |
| Backend  | http://localhost:8080 | http://localhost:8080 |
| Postgres | 127.0.0.1:5432       | localhost:5432        |

---

## Tech Stack

| Layer       | Tech                                                         |
|-------------|--------------------------------------------------------------|
| Backend     | Spring Boot 3.2.3, Java 21, Spring Security 6, Spring Data JPA, Spring Actuator |
| Auth        | JWT (JJWT 0.12.5), stateless, stored in localStorage         |
| Database    | PostgreSQL 15, Flyway migrations, Hibernate ORM              |
| Monitoring  | Sentry (frontend @sentry/react, backend sentry-spring-boot-starter-jakarta) |
| Frontend    | React 18, React Router v6, Axios, Tailwind CSS               |
| Build       | Maven (backend), Vite (frontend), Docker Compose             |
| Production  | Multi-stage Docker (nginx for frontend), production Spring profile |

---

## Key Configuration

### application.yml (backend)
- `spring.jpa.hibernate.ddl-auto: validate` — schema managed entirely by Flyway, **never** use `create` or `update`
- `spring.flyway.locations: classpath:db/migration`
- JWT secret read from `JWT_SECRET` env var (no default — app fails without it)
- JWT expiry: 24h (`JWT_EXPIRATION_MS: 86400000`)
- Server port: `${PORT:8080}` — configurable for PaaS
- CORS: `${CORS_ALLOWED_ORIGINS:http://localhost:*}` — must be set to actual domain in production
- Sentry: `${SENTRY_DSN:}` — empty = disabled (safe for local dev)
- Actuator: only `health` and `info` endpoints exposed, `show-details: never`

### application-prod.yml (backend)
Activated via `SPRING_PROFILES_ACTIVE=prod`. Overrides: SQL logging off, HikariCP pool tuning, INFO-level logging.

### vite.config.js (frontend)
- Dev server: port 5173 with `/api` proxy → `http://localhost:8080`
- Production build: `sourcemap: true` for Sentry stack traces
- Proxy is dev-only — production uses nginx reverse proxy

### nginx.conf (frontend)
- Serves static build from `/usr/share/nginx/html`
- `try_files $uri $uri/ /index.html` for React Router client-side routes
- Proxies `/api/` and `/actuator/` to `http://backend:8080`
- Gzip enabled

### docker-compose.yml environment variables
```
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-fantasyseers_secret}
JWT_SECRET=${JWT_SECRET:-fantasy-seers-super-secret-jwt-key-change-in-production}
SENTRY_DSN=${SENTRY_DSN:-}     # Set in Railway
VITE_SENTRY_DSN=               # Build-time, set in .env or Railway
```

---

## Database Migrations (Flyway)

Migrations live in `backend/src/main/resources/db/migration/` and run automatically on startup.

- **V1__initial_schema.sql** — full schema: users, friend_groups, friend_group_members, props, prop_groups, votes, point_transactions, follows
- **V2__add_prop_submission_columns.sql** — added `min_wager` and `max_wager` to props
- **V3__add_group_invites.sql** — `group_invites` table with UNIQUE constraint on `(group_id, invitee_id)`
- **V4__add_user_profile_fields.sql** — added `favorite_nfl_team`, `favorite_nba_team`, `alma_mater` on users
- **V5__drop_unused_badge_and_user_fields.sql** — dropped `badges`, `user_badges` tables and `is_public` column
- **V6__drop_unused_prop_fields.sql** — dropped `game_id`, `stat_key`, `stat_threshold`, `stat_direction` from props
- **V7__add_performance_indexes.sql** — indexes on `props(status)`, `props(closes_at)`, `props(created_by)`, `friend_groups(owner_id)`
- **V8__add_cascade_to_group_invites.sql** — `ON DELETE CASCADE` on all `group_invites` foreign keys
- **V9__drop_unused_prop_submissions.sql** — dropped unused `prop_submissions` table
- **V10__nfl_players.sql** — `nfl_players` table (sleeper_id, full_name, position, nfl_team, status) + 300 player inserts
- **V11__user_rankings.sql** — `user_rankings` table with UNIQUE(user_id, player_id) for personalized rankings
- **V12__consensus_rankings.sql** — `consensus_rankings` table (player_id, overall_rank, positional_rank) + 300 ranked inserts
- **V13__add_adp_to_nfl_players.sql** — added `adp` (int, nullable) column to nfl_players
- **V14__populate_adp.sql** — populated ADP values from Sleeper API search_rank

**Adding a new migration:** Create `V15__description.sql` in snake_case. Do not modify existing migration files.

---

## API Overview

All endpoints are prefixed `/api` and return JSON.

| Controller         | Prefix           | Key Endpoints                                                                 |
|--------------------|------------------|-------------------------------------------------------------------------------|
| AuthController     | `/api/auth`      | `POST /register`, `POST /login`, `POST /logout`                               |
| UserController     | `/api/users`     | `GET /me`, `PUT /me` (`@Valid`, `@Size`-enforced), `GET /me/authorities`      |
| PropController     | `/api/props`     | `POST /` (admin only, `@PreAuthorize`), `POST /submit` (user), `GET /public` (paginated), `GET /{id}` (scope-checked) |
| VoteController     | `/api/props`     | `POST /{id}/vote`, `GET /{id}/split` (scope-checked, requires auth)          |
| AdminController    | `/api/admin`     | `GET /props/pending`, `GET /props/closed`, `POST /props/{id}/approve`, `POST /props/{id}/reject`, `POST /props/{id}/resolve?result=YES\|NO`, `POST /props`, `GET /groups` |
| LeaderboardController | `/api/leaderboard` | `GET /global` (public), `GET /group/{groupId}` (auth + membership)       |
| FriendGroupController | `/api/groups` | `POST /`, `POST /join`, `GET /`, `GET /{id}`, `GET /{id}/props`, `PATCH /{id}`, `DELETE /{id}/members/{userId}`, `DELETE /{id}/members/me`, `POST /{id}/invite`, `GET /invites`, `POST /invites/{inviteId}/accept`, `POST /invites/{inviteId}/reject` |
| RankingsController | `/api/rankings` | `GET /my-sheet` (user's rankings, consensus fallback), `POST /my-sheet` (save rankings, `{rankings: [{playerId, overallRank, positionalRank}]}`) |
| Actuator           | `/actuator`      | `GET /health` (public, no details)                                            |

---

## Frontend Routing

Defined in `src/main.jsx` using React Router v6. Wrapped in `Sentry.ErrorBoundary`.

| Path          | Component       | Guard        |
|---------------|-----------------|--------------|
| `/login`      | Login           | public       |
| `/register`   | Register        | public       |
| `/`           | Dashboard       | PrivateRoute |
| `/groups`     | GroupsPage      | PrivateRoute |
| `/groups/:id` | GroupFeedPage   | PrivateRoute |
| `/groups/:id/settings` | GroupSettingsPage | PrivateRoute |
| `/master-sheet`| MasterSheetPage | PrivateRoute |
| `/leaderboard`| LeaderboardPage | PrivateRoute |
| `/profile`    | ProfilePage     | PrivateRoute |
| `/admin`      | AdminDashboard  | AdminRoute   |

- **PrivateRoute** — redirects unauthenticated users to `/login`
- **AdminRoute** — redirects non-ADMIN users to `/`
- **AuthContext** — stores user + JWT in localStorage, provides `login`/`logout`. Checks JWT `exp` claim on page load; clears expired tokens immediately.

### Frontend API Client (`client.js`)
Exports namespaced API helpers: `authApi`, `propsApi`, `groupsApi`, `adminApi`, `leaderboardApi`, `userApi`, `rankingsApi`. Each wraps Axios calls to `/api/*`.

### Layout Architecture
- **AppLayout** — shared layout wrapper. Renders Sidebar + top nav bar (username, point bank, sign out). Polls `userApi.getMe()` every 30s to refresh point bank across all pages (uses `useRef` to avoid interval churn). Logo and "Fantasy Seers" text in sidebar link to Dashboard.
- **Sidebar** — persistent left sidebar (desktop) / slide-in drawer (mobile). Nav items: Dashboard, Master Sheet, Leagues, Leaderboard, Profile, Admin Uploads (admin-only). Logo + text link to `/`.
- Mobile top bar shows hamburger + logo (links to `/`) on left; username, points, sign out on right.

### Key UI Patterns
- **SubmitPropCard** — expandable form; dynamically shows group selector when scope is `GROUP` or `FRIENDS_AND_GROUP`. Shows inline `alert-error` on submission failure.
- **PropCard** — unified card with 7 visual states. Split data shows loading spinner while fetching and inline error if fetch fails.
- **VoteModal** — "Back to Feed" button wrapped in `try/finally` so modal always closes even if `onVoted()` throws.
- **Dashboard** — sport filter pills (ALL, NFL, NBA, MLB, NHL). Handles paginated API response (`data.content || data`). Error state with "Try Again" button.
- **Login/Register** — password field has show/hide toggle (eye icon).
- **GroupsPage** — join success toast (auto-dismiss 4s). Separate `groupsError`/`invitesError` states.
- **GroupSettingsPage** — kick/leave errors display inline (no `alert()` calls).
- **AdminDashboard** — all three fetches have error states with retry or graceful fallback.
- **LeaderboardPage** — medal colors use `text-gold-400`/`text-slate-300`/`text-gold-600`. Error state replaces table content.
- **MasterSheetPage** — personalized NFL player ranking sheet. Drag-and-drop via @dnd-kit. Columns: Rank, Player (Team), Position (positional rank chip), ADP. Position filter pills (ALL, QB, RB, WR, TE, K, DEF). Dragging recalculates both overall and positional ranks. Falls back to consensus rankings when user has no saved rankings (`isDefault: true` banner). Save sends `{rankings: [{playerId, overallRank, positionalRank}]}` to `POST /api/rankings/my-sheet`.

### Shared Utils
- `src/utils/sportClasses.js` — `getSportClass()` function (used by PropCard, VoteModal, AdminDashboard)
- `src/utils/teams.js` — `NFL_TEAMS` and `NBA_TEAMS` arrays (used by Register, ProfilePage)

### Theme & Design Tokens

**Dark mode UI.** All colors in `tailwind.config.js` under `theme.extend.colors`.

| Token    | Purpose                                  |
|----------|------------------------------------------|
| `void`   | Dark backgrounds (950 `#0C0F1A` – 600 `#3A4259`) |
| `oracle` | Primary purple / brand — sparingly       |
| `gold`   | Points, rewards, admin accents           |
| `win`    | Success / YES votes                      |
| `loss`   | Failure / NO votes                       |
| `live`   | Live indicator orange                    |

**Text:** `text-slate-100` (headings), `text-slate-200` (body), `text-slate-400` (secondary), `text-slate-500` (muted). Semantic: use `400` variants only.
**Typography:** `font-display` (Syne), `font-cinzel` (Cinzel), `font-body` (Inter).
**Error text:** `text-loss-400` (not `text-red-400`).

---

## Domain Model

- **Prop** — yes/no proposition with `minWager`/`maxWager` limits. Scopes: `PUBLIC`, `FRIENDS`, `GROUP`, `FRIENDS_AND_GROUP`. Statuses: `PENDING` → `OPEN` → `CLOSED` → `RESOLVED`. `closesAt` validated with `@Future`.
- **Vote** — YES/NO choice with wager amount. `VoteRequest.choice` typed as `Vote.Choice`. One vote per user per prop.
- **PointTransaction** — audit trail for all point movements. Types: `WAGER`, `PAYOUT`, `BONUS`, `STARTING_BALANCE`. Created on registration, voting, and resolution.
- **FriendGroup** — named group with 8-char invite code. `ON DELETE CASCADE` on group_invites FKs.
- **GroupInvite** — PENDING/ACCEPTED/REJECTED. Non-member invite attempts throw `AccessDeniedException` (403).
- **User** — roles: `USER` or `ADMIN`. Starts with 1000 `pointBank`. Profile: `favoriteNflTeam`, `favoriteNbaTeam`, `almaMater` (validated with `@Size`).
- **NflPlayer** — NFL player from Sleeper API. Fields: sleeperId (unique), fullName, position (QB/RB/WR/TE/K/DEF), nflTeam, status, adp. 300 players seeded via V10 migration.
- **ConsensusRanking** — expert consensus ranking for each NflPlayer. OneToOne with NflPlayer. Fields: overallRank, positionalRank.
- **UserRanking** — user's personalized ranking for an NflPlayer. ManyToOne User + ManyToOne NflPlayer. UNIQUE(user_id, player_id). Bulk delete + save via `@Modifying` JPQL + `flush()`. Falls back to ConsensusRankings when empty.
- **Prop lifecycle:** User-submitted: `PENDING` → approval → `OPEN` → `CLOSED` → `RESOLVED`. Admin-created: `OPEN` → `CLOSED` → `RESOLVED`. Auto-close via `PropClosingScheduler` (60s). Group membership validated on user-submitted group props.

---

## Security

- **Auth endpoints rate-limited** — `RateLimitFilter`: 10 req/min per IP on `/api/auth/*`
- **JWT** — validated in `JwtAuthFilter`, parsed once per request via `extractAllClaims()`. Token blacklisting via in-memory `TokenBlacklistService`.
- **Admin endpoints** — `@PreAuthorize("hasRole('ADMIN')")` on AdminController and `POST /api/props`
- **Scope-based access control** — `PropService.checkPropAccess()` enforces group membership on `getPropById` and `getSplit` for GROUP-scoped props
- **Input sanitization** — HTML tags stripped from prop title/description. `@Valid` + `@Size` on profile fields. `@Future` on `closesAt`.
- **CORS** — configurable via `CORS_ALLOWED_ORIGINS` env var. Default: `http://localhost:*`
- **Error handling** — `GlobalExceptionHandler` with catch-all returning generic 500 message. Unexpected exceptions reported to Sentry. No stack traces leaked.
- **Transaction safety** — `@Transactional` on all PropService methods. Pessimistic locking on vote (user row) and resolution (prop row). Batch `saveAll()` in ResolutionService.

---

## Error Handling

`GlobalExceptionHandler` catches exceptions and returns JSON `{"message": "..."}`:

| Exception                  | HTTP Status   |
|----------------------------|---------------|
| `IllegalArgumentException` | 400           |
| `IllegalStateException`    | 409           |
| `AccessDeniedException`    | 403           |
| `MethodArgumentNotValidException` | 400    |
| `Exception` (catch-all)    | 500 + Sentry  |

---

## Common Gotchas

- **JPQL, not SQL** — queries use entity/field names, not table/column names.
- **Flyway owns the schema** — never change `ddl-auto` to `create` or `update`.
- **`@Builder.Default`** — required on Lombok `@Builder` fields with defaults.
- **`FetchType.LAZY`** — access lazy associations within `@Transactional` methods.
- **Two prop creation flows** — `submitProp()` (user, PENDING) vs `createProp()` (admin, OPEN).
- **`@apply` does not support Tailwind opacity modifiers** — use `theme()` or raw `rgba()` in CSS.
- **Docker frontend is production nginx** — no hot reload. For dev, run frontend locally (`npm run dev`) with backend+DB in Docker.
- **CORS configurable** — set `CORS_ALLOWED_ORIGINS` for production domain.
- **JWT secret must be ≥48 bytes** — HMAC-SHA384 requires it. The default fallback is 55 bytes but should be overridden in production.

---

## Deployment (Railway)

**Required env vars for backend:**
```
SPRING_DATASOURCE_URL, SPRING_DATASOURCE_USERNAME, SPRING_DATASOURCE_PASSWORD
JWT_SECRET          (openssl rand -base64 64)
CORS_ALLOWED_ORIGINS (https://your-frontend.up.railway.app)
SPRING_PROFILES_ACTIVE=prod
SENTRY_DSN          (from Sentry project)
```

**Frontend build-time:**
```
VITE_SENTRY_DSN     (from Sentry project)
```

Health check: `GET /actuator/health` returns `{"status":"UP"}`.
