# Fantasy Seers 🔮

Social sports prediction platform. Wager points on yes/no props, get rewarded for going against the crowd.

## Quick Start

```bash
# Clone and run everything with one command
docker-compose up --build
```

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:8080       |
| Database | localhost:5432              |

## Project Structure

```
fantasy-seers/
├── docker-compose.yml
├── backend/                  # Spring Boot API (Java 21)
│   ├── src/main/java/com/fantasyseers/api/
│   │   ├── config/           # Security, JPA auditing
│   │   ├── controller/       # REST endpoints
│   │   ├── dto/              # Request/response records
│   │   ├── entity/           # JPA entities
│   │   ├── repository/       # Spring Data repositories
│   │   ├── security/         # JWT filter + utils
│   │   └── service/          # Business logic
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/     # Flyway SQL migrations
└── frontend/                 # React + Vite + Tailwind
    └── src/
        ├── api/              # Axios client
        ├── context/          # Auth context
        └── pages/            # Login, Register, Dashboard
```

## API Endpoints (Phase 1)

### Auth
| Method | Endpoint             | Description     |
|--------|----------------------|-----------------|
| POST   | /api/auth/register   | Create account  |
| POST   | /api/auth/login      | Sign in → JWT   |

## Tech Stack

- **Backend**: Spring Boot 3.2, Spring Security, JPA, Flyway
- **Database**: PostgreSQL 15
- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Auth**: JWT (stateless)
- **Deploy**: Docker Compose (dev) → Railway (prod)

## Environment Variables

All configured in `docker-compose.yml`. For production, set:

```
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
JWT_SECRET          # Use a long random string in production
JWT_EXPIRATION_MS   # Default: 86400000 (24h)
```
