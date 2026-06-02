FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci

FROM deps AS build
COPY backend ./backend
COPY frontend ./frontend
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scpd_cms?schema=public
RUN npm --prefix backend run build
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm --prefix frontend run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend/package*.json ./backend/
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend
ENV FRONTEND_DIST_DIR=/app/frontend/dist
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
