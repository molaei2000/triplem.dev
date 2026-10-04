# syntax=docker/dockerfile:1.7
#
# Production image for triplem.dev (Nuxt 4, node-server preset).
#
#   docker build -t triplem.dev .
#   docker run --rm -p 3000:3000 --env-file .env triplem.dev
#
# Stages: `base` installs pnpm, `deps` fetches packages from the lockfile only (cached until the
# lockfile changes), `build` installs offline and runs `nuxt build`, and `runtime` ships `.output`
# on a plain Node image, no pnpm or node_modules.

ARG NODE_VERSION=22
ARG PNPM_VERSION=12.6.0

# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
ENV CI=true \
    NUXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}
WORKDIR /app

# ---------------------------------------------------------------------------------------------
# Download every package in the lockfile into the pnpm store. Only the manifests are copied, so
# this layer survives source changes; the BuildKit cache mount keeps the store between builds.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --store-dir /pnpm/store

# ---------------------------------------------------------------------------------------------
# `pnpm install` runs after the source is copied because `postinstall` is `nuxt prepare`, which
# needs nuxt.config.ts and the app; `--offline` links everything from the store fetched above.
FROM deps AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile --store-dir /pnpm/store
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN pnpm build

# ---------------------------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production \
    NUXT_TELEMETRY_DISABLED=1 \
    HOST=0.0.0.0 \
    PORT=3000 \
    # Nuxt Content rebuilds its SQLite cache from the bundled dump on first request; keep it in
    # a writable directory separate from the read-only app code.
    NUXT_CONTENT_DATABASE_FILENAME=/app/.data/contents.sqlite
WORKDIR /app
RUN mkdir -p /app/.data && chown node:node /app/.data
COPY --from=build --chown=root:root /app/.output ./.output
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
