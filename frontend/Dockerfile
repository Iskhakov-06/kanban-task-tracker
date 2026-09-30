# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22

# ── 1. Install dependencies (cached unless package*.json change) ──────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ── 2. Build static bundle with Vite ──────────────────────────────────────
FROM deps AS build
COPY . .
RUN npm run build

# ── 3. Serve with unprivileged nginx (no Node in the final image) ─────────
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
