# SCPD Case Management System (CMS)

Production-grade Case Management System for the Office of the State Commissioner for Persons with Disabilities (SCPD).

## Stack

- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL 16
- Frontend: React + TypeScript + TailwindCSS + React Router + React Query
- Auth: JWT (access + refresh) + RBAC
- DB: partitioned tables + materialized views (see `db/schema.sql`)

## Quickstart (local)

1. Start PostgreSQL

- From this folder: `docker compose up db -d`

2. Backend

- `cd backend`
- `cp .env.example .env`
- `npm install`
- `npm run dev`

3. Frontend

- `cd frontend`
- `cp .env.example .env`
- `npm install`
- `npm run dev`

## Docs

- API: `docs/api-v1.md`
- DB schema: `db/schema.sql`
- Materialized view refresh: `db/refresh-mvs.sql`

## Deploy on Railway

This repo is ready to run on Railway as a single service (frontend + backend in one container).

1. In Railway, create a new service from this repo.
2. Set the service **Root Directory** to `case-management-system`.
3. Railway will detect and use `case-management-system/Dockerfile`.
4. Add a PostgreSQL service in Railway and copy its `DATABASE_URL` into this app service.
5. Add required environment variables in the app service:

- `NODE_ENV=production`
- `PORT=8080` (or leave unset; Railway injects `PORT` automatically)
- `DATABASE_URL=<railway postgres url>`
- `JWT_ACCESS_SECRET=<at least 16 chars>`
- `JWT_REFRESH_SECRET=<at least 16 chars>`
- `CORS_ORIGIN=https://<your-app-domain>`
- `VITE_API_BASE_URL=/api/v1`

6. Optional notification variables (only if you use them): `SMTP_*`, `EMAIL_*`, `GOVT_SMS_*`, webhook URLs.
7. Set healthcheck path to `/api/v1/health` in Railway service settings.
8. Deploy.

Notes:
- The container start command runs `prisma migrate deploy` automatically before starting the API.
- Frontend static files are served by the backend from the same Railway domain.
