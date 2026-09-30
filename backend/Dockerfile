# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22

# ── 1. Production dependencies only (cached unless package*.json change) ──
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# ── 2. Runtime image ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# tini = proper PID 1: forwards SIGTERM and reaps zombies (clean `docker stop`)
RUN apk add --no-cache tini

# Copy only what the app needs at runtime, owned by the unprivileged "node" user
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src

# winston writes log files here
RUN mkdir -p logs && chown node:node logs

USER node
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/app.js"]
