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
│       └── db/migration/        # Flyway SQL migrations (V1, V2)
└── frontend/                    # React 18 + Vite 5 + Tailwind CSS 3
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx             # Router setup + AuthContext + PrivateRoute/AdminRoute
        ├── api/client.js        # Axios instance + API methods (propsApi, groupsApi, adminApi)
        ├── context/AuthContext.jsx
        ├── components/          # AppLayout, Sidebar, PropCard, SubmitPropCard, VoteModal
        └── pages/               # Login, Register, Dashboard, AdminDashboard,
                                 # GroupsPage, GroupFeedPage
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

**Adding a new migration:** Create `V3__description.sql`. Do not modify existing migration files.

---

## API Overview

All endpoints are prefixed `/api` and return JSON.

| Controller         | Prefix           | Key Endpoints                                                                 |
|--------------------|------------------|-------------------------------------------------------------------------------|
| AuthController     | `/api/auth`      | `POST /register`, `POST /login`                                               |
| UserController     | `/api/users`     | `GET /me`, `GET /me/authorities`                                              |
| PropController     | `/api/props`     | `POST /submit` (user), `GET /public`, `GET /{id}`                            |
| VoteController     | `/api/props`     | `POST /{id}/vote`, `GET /{id}/split`                                         |
| AdminController    | `/api/admin`     | `GET /props/pending`, `POST /props/{id}/approve`, `POST /props/{id}/reject`, `POST /props/{id}/resolve` |
| FriendGroupController | `/api/groups` | `POST /` (create), `POST /join` (invite code), `GET /` (my groups), `GET /{id}`, `GET /{id}/props` |

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
| `/admin`      | AdminDashboard  | AdminRoute   |

- **PrivateRoute** — redirects unauthenticated users to `/login`
- **AdminRoute** — redirects non-ADMIN users to `/`
- **AuthContext** — stores user + JWT in localStorage, provides `login`/`logout`

### Frontend API Client (`client.js`)
Exports namespaced API helpers: `authApi`, `propsApi`, `groupsApi`, `adminApi`, `usersApi`. Each wraps Axios calls to `/api/*`.

### Layout Architecture
- **AppLayout** — shared layout wrapper for all authenticated pages. Renders the `Sidebar` and a top navigation bar with username, point bank, and sign out. Uses React Router `<Outlet />` for nested routes. Individual pages no longer have their own navbars.
- **Sidebar** — persistent left sidebar (desktop) / slide-in drawer (mobile). Nav items: Dashboard, Trends, Leagues, Leaderboard, Admin Uploads (admin-only). Shows logo, nav links with active state via `NavLink`, and user avatar footer.
- Mobile top bar shows hamburger + logo on the left; username, points, and sign out on the right.

### Key UI Patterns
- **SubmitPropCard** — expandable form; dynamically shows group selector when scope is `GROUP` or `FRIENDS_AND_GROUP`. Fetches user's groups on expand.
- **VoteModal** — reused on Dashboard and GroupFeedPage for casting votes.
- **Dashboard** — shows Public Props and Resolved props in separate sections; refreshes pointBank every 30s.
- **GroupsPage** — create/join forms + group list with clickable invite codes (copy to clipboard).
- **GroupFeedPage** — group header + group-scoped props (open/resolved sections).

### Theme & Design Tokens

All colors are defined in `tailwind.config.js` under `theme.extend.colors`. **Never use raw hex/rgba values in components** — use Tailwind classes with these tokens or the CSS component classes from `index.css`.

| Token    | Purpose                                  |
|----------|------------------------------------------|
| `void`   | Dark backgrounds (950–600)               |
| `oracle` | Primary purple / brand (900–100)         |
| `gold`   | Points, rewards, admin accents (600–200) |
| `win`    | Success / YES votes (900–300)            |
| `loss`   | Failure / NO votes (900–400)             |
| `live`   | Live indicator orange (flat)             |

**CSS component classes** (defined in `index.css`, use instead of inline styles):
- **Layout:** `.glass-card`, `.glass-card-hover`, `.glass-nav`
- **Chips:** `.chip-oracle`, `.chip-oracle-active`, `.chip-gold`, `.chip-gold-strong`, `.chip-win`, `.chip-loss`
- **Buttons:** `.btn-oracle`, `.btn-gold`, `.btn-ghost`, `.btn-approve`, `.btn-reject`
- **Alerts:** `.alert-error`
- **Cards:** `.card-win-border`, `.card-win-border-light`, `.card-loss-border`, `.card-loss-border-light`, `.card-pending-border`
- **Vote UI:** `.vote-yes`, `.vote-yes-idle`, `.vote-no`, `.vote-no-idle`, `.bar-yes`, `.bar-no`
- **Other:** `.input-base`, `.rake-chip`, `.skeleton`, `.sport-*` badges, `.live-dot`

For error text, use `text-loss-400` (not `text-red-400`). For muted/secondary text, `text-slate-*` is fine (built-in Tailwind). For backgrounds with opacity, use Tailwind's `/` modifier in markup (e.g., `bg-oracle-500/10`) but in `@apply` or CSS use `theme('colors.oracle.500 / 0.1')` instead.

---

## Domain Model

- **Prop** — a yes/no proposition with `minWager`/`maxWager` limits. Scopes: `PUBLIC`, `FRIENDS`, `GROUP`, `FRIENDS_AND_GROUP`. Statuses: `PENDING` → `OPEN` → `CLOSED` → `RESOLVED`. Has `isAdminProp` flag to distinguish admin-created vs user-submitted props.
- **Vote** — a user's YES/NO choice on a prop with a wager amount. One vote per user per prop.
- **FriendGroup** — a named group with an 8-char uppercase invite code. Owner is auto-member. Members accessed via lazy-loaded `Set<User>`.
- **User** — roles: `USER` or `ADMIN`. Starts with 1000 `pointBank`. Tier system: Rookie (0–4999), Pro (5000–14999), Elite (15000–49999), Legend (50000+).
- **Prop lifecycle:**
  - **User-submitted:** `PENDING` → admin approval → `OPEN` → `CLOSED` → `RESOLVED`
  - **Admin-created:** `OPEN` → `CLOSED` → `RESOLVED` (skips PENDING)
- **Prop scoping:** Props can be scoped to groups. `PropRepository.findVisibleToUser()` handles visibility filtering based on scope and group membership.

---

## Error Handling

`GlobalExceptionHandler` (`@RestControllerAdvice` in `config/`) catches service-layer exceptions and returns JSON `{"message": "..."}`:

| Exception                  | HTTP Status   | Examples                                          |
|----------------------------|---------------|---------------------------------------------------|
| `IllegalArgumentException` | 400 Bad Request | "Invalid invite code", "Prop not found"          |
| `IllegalStateException`    | 409 Conflict   | "Already a member", "Already voted", "Insufficient points" |
| `AccessDeniedException`    | 403 Forbidden  | "Not a member of this group"                     |

Frontend components read error messages via `err.response?.data?.message` in catch blocks.

**Axios interceptor** (`client.js`): Only redirects to `/login` on 401 or on 403 when no token exists in localStorage. Authenticated 403s (permission errors) propagate to component error handlers.

---

## Security Notes

- JWT is validated in `JwtAuthFilter` (extends `OncePerRequestFilter`). Token extraction is wrapped in try/catch for `JwtException` to prevent malformed tokens from bubbling up.
- `@PreAuthorize("hasRole('ADMIN')")` guards all admin endpoints.
- `AccessDeniedException` from `org.springframework.security.access` returns 403 via `GlobalExceptionHandler`.
- `@EnableJpaAuditing` is on `AppConfig`, not the main application class.
- Group endpoints verify membership before returning data (e.g., `getGroupById`, `getGroupProps`).
- **Wager limits** are enforced server-side in `VoteService.castVote()` — rejects wagers outside `minWager`/`maxWager` bounds. Frontend `VoteModal` also validates client-side.

---

## Common Gotchas

- **JPQL, not SQL** — queries in `@Query` use entity/field names, not table/column names. Enum values must be bound as `@Param` parameters, not inline strings.
- **PostgreSQL + `DISTINCT` + `ORDER BY`** — if `ORDER BY` uses an expression not in the `SELECT` list, PostgreSQL rejects it. Prefer `EXISTS` subqueries over `LEFT JOIN` + `DISTINCT` to avoid this.
- **Flyway owns the schema** — never change `ddl-auto` to `create` or `update` in any environment.
- **`@Builder.Default`** — Lombok `@Builder` fields with defaults (e.g., `Set<User> members`) need `@Builder.Default` or the default is ignored when using the builder.
- **`FetchType.LAZY`** — `FriendGroup.members` and `FriendGroup.owner` are lazy-loaded. Access them within a `@Transactional` method or they'll throw `LazyInitializationException`.
- **Two prop creation flows** — `PropService.submitProp()` (user, starts PENDING) vs `PropService.createProp()` (admin, starts OPEN). Don't confuse them.
- **Invite codes are case-insensitive** — `FriendGroupService.joinGroup()` uppercases the input before lookup.
- **Spring Security returns 403 for unauthenticated requests** (not 401) — the default filter chain with stateless sessions does this. The Axios interceptor accounts for this by checking whether a token exists in localStorage to distinguish auth failures from permission errors.
- **`@apply` does not support Tailwind opacity modifiers** — `@apply bg-oracle-500/10` fails at build time. Use `background: theme('colors.oracle.500 / 0.1')` in CSS instead. The `/` modifier works fine in JSX `className` strings.
