# Hotel PMS (Hotely)

Multi-tenant hotel property management system. Staff sign in, select a property, then manage guests, reservations, rooms, reports, settings, and staff accounts. Access is role-based (reception, housekeeping, maintenance, revenue, management, and system admin).

This repository is a monorepo: React frontend, Express API, and Docker Compose for PostgreSQL plus the API.

## Features

| Area | What it does |
|------|----------------|
| Dashboard | Role-aware live metrics (arrivals, rooms, housekeeping, revenue, and so on) |
| Guests | Guest registry, reservations, check-in and check-out |
| Rooms | Inventory and status (vacant, occupied, dirty, maintenance, etc.) |
| Reports | Occupancy-style and revenue pipeline summaries |
| Staff | Create and manage accounts within the org hierarchy |
| Properties | SystemAdmin creates and archives properties |
| Settings | Property name, timezone, default check-in/out (SystemAdmin and General Manager) |

**Tenancy:** An organization owns one or more properties. Rooms, guests, reservations, and settings are scoped to the active property. Non-admin staff are assigned through `staff_property`.

**Auth:** JWT staff login. Optional public registration creates an organization, first property, and SystemAdmin (`ALLOW_PUBLIC_REGISTER`). Otherwise use `BOOTSTRAP_ADMIN_*` when the staff table has no SystemAdmin yet.

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React (Vite), Ant Design, TanStack Query, Zustand, React Router |
| Backend | Node.js, Express, PostgreSQL (`pg`), bcrypt, JWT |
| Local stack | Docker Compose (Postgres 16 + API); frontend usually runs on the host in development |

## Repository layout

```
frontend/          React SPA
backend/           Express API, SQL schema and migrations
backend/db/        schema.sql and migrate_*.sql
docs/              Diagrams (draw.io)
docker-compose.yml Postgres + API
```

Root `package.json` proxies common scripts into `frontend/` and `backend/`.

## Prerequisites

- Node.js 20+ (or current LTS)
- npm
- Docker and Docker Compose (recommended for Postgres + API)
- Or a local PostgreSQL 16 instance if you run the API outside Docker

## Quick start (recommended)

### 1. Clone and install

```bash
git clone <repo-url>
cd hotel-frontend
npm install --prefix frontend
npm install --prefix backend
```

### 2. Docker env (API + Postgres)

```bash
cp docker.env.example .env
```

Edit `.env` and set at least:

- `JWT_SECRET` (long random string, 16+ characters; not a placeholder)
- `BOOTSTRAP_ADMIN_PASSWORD` (strong password for the first SystemAdmin)

### 3. Start Postgres and the API

```bash
npm run docker:up
```

Or: `docker compose up --build`

- API: http://localhost:4000
- Health: http://localhost:4000/api/health
- Postgres: localhost:5432 (defaults often user/db `hotel`; password from `.env`)

A fresh Postgres volume runs SQL under `backend/db/` via `docker-entrypoint-initdb.d`.

### 4. Frontend env and dev server

```bash
cp frontend/.env.example frontend/.env
```

Ensure `VITE_API_BASE_URL=http://localhost:4000/api`, then:

```bash
npm run dev
```

Open http://localhost:5173 and sign in with the bootstrap admin from `.env` (`BOOTSTRAP_ADMIN_USERNAME` / `BOOTSTRAP_ADMIN_PASSWORD`). Pick or create a property when prompted.

### 5. Stop Docker

```bash
npm run docker:down
```

Data in the Docker volume is kept unless you remove volumes (`docker compose down -v` wipes the database; local dev only).

## Alternative: API on the host

Use Docker only for Postgres, or use your own Postgres.

1. Set `backend/.env` from `backend/.env.example` (at least `DATABASE_URL`, `JWT_SECRET`, bootstrap admin vars).
2. Apply schema (host Postgres):

```bash
npm run backend:init-db
```

3. Run API with watch:

```bash
npm run dev:backend
```

4. Run frontend as above (`npm run dev`).

## Environment reference

| File | Purpose |
|------|---------|
| Root `.env` | Read by Docker Compose (copy from `docker.env.example`) |
| `backend/.env` | Local Node API (copy from `backend/.env.example`) |
| `frontend/.env` | Vite (copy from `frontend/.env.example`) |

Important variables:

| Variable | Where | Notes |
|----------|--------|--------|
| `JWT_SECRET` | Compose / backend | Required. Production refuses weak or missing secrets |
| `BOOTSTRAP_ADMIN_*` | Compose / backend | Creates SystemAdmin once when none exists |
| `ALLOW_PUBLIC_REGISTER` | Compose / backend | `true` / `false`; Docker default is `false` |
| `DATABASE_URL` | backend | Host API connection string |
| `CORS_ORIGIN` | Compose / backend | e.g. `http://localhost:5173` |
| `VITE_API_BASE_URL` | frontend | e.g. `http://localhost:4000/api` |

Do not commit real `.env` files with production secrets.

## Roles (summary)

Hierarchy: SystemAdmin, then General Manager, then department managers, then line staff.

| Actor | Typically creates |
|-------|-------------------|
| SystemAdmin | General Manager and recovery for other roles |
| General Manager | Department heads |
| Front Office Manager | Receptionists |
| Housekeeping Manager | Housekeeping staff |
| Maintenance Manager | Maintenance staff |

Revenue Manager and Accountant are reporting-focused in this build. The staff API only allows creating and managing roles permitted for the actor.

## Common scripts (repo root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend Vite dev server |
| `npm run dev:backend` | API with `--watch` |
| `npm run build` | Production frontend build |
| `npm run lint` | Frontend ESLint |
| `npm test` | Frontend Vitest + backend Node tests |
| `npm run backend:init-db` | Apply schema/migrations on host Postgres |
| `npm run docker:up` | Build and start Compose stack |
| `npm run docker:up:detached` | Same, detached |
| `npm run docker:down` | Stop containers |
| `npm run docker:migrate-db` | Legacy roles migration on existing volume |
| `npm run docker:migrate-pms` | PMS tables migration on existing volume |
| `npm run docker:migrate-multitenant` | Org/property migration on existing volume |

Package-local scripts also exist under `frontend/` and `backend/` (`npm test`, `npm run dev`, etc.).

## Testing

```bash
npm test
```

- Frontend: Vitest (`frontend/src/**/*.test.js`), including permission matrices and dashboard strategies
- Backend: Node built-in test runner + supertest (`backend/tests/`), covering permissions, roles, JWT, tenancy, and basic API/middleware behavior

## Migrations on an existing Docker volume

Init scripts do not re-run after the Postgres volume already exists. After pulling schema changes, apply once:

```bash
npm run docker:migrate-db
npm run docker:migrate-pms
npm run docker:migrate-multitenant
```

Each pipes the matching file under `backend/db/` into the Compose Postgres service (default user/db `hotel`). If you changed `POSTGRES_USER` or `POSTGRES_DB`, adjust the `psql` command in `package.json` accordingly.

## Public registration

Controlled by `ALLOW_PUBLIC_REGISTER`:

| Value | Behavior |
|-------|----------|
| `true` | Anyone can create a new organization and admin |
| `false` | Registration disabled (Docker default) |
| unset | Allowed when `NODE_ENV` is not `production`; denied in production |

`GET /api/auth/registration-status` tells the UI whether signup is open.

## Production notes

- `npm run build` builds the frontend under `frontend/dist`
- Serve the SPA behind your preferred static host or reverse proxy; point it at the API
- Set a strong `JWT_SECRET`, disable public registration unless you intend self-serve multi-tenant signup, use HTTPS, and back up Postgres
- Prefer suspending staff over deleting when you need an immediate lockout

## Security

Harden JWT secrets, HTTPS, backups, and RBAC before exposing the system beyond demos or internal use. Never commit production passwords or real `.env` files.
