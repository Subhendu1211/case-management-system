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
