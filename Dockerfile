FROM node:20-alpine AS base
WORKDIR /app

FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

FROM base AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

FROM base AS build
COPY backend ./backend
COPY frontend ./frontend
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scpd_cms?schema=public
RUN npm --prefix backend run build
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm --prefix frontend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/package*.json ./backend/
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend
ENV FRONTEND_DIST_DIR=/app/frontend/dist
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
