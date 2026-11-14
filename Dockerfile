# syntax=docker/dockerfile:1.7
#
# Virtual Science Park — frontend image (TanStack Start + Nitro, Node server).
# Build:  docker build -t adcbueno1/virtual-science-park .
# Run:    docker run -p 3000:3000 -e API_URL=http://api:8000 adcbueno1/virtual-science-park
#
# API_URL (runtime) points the app at the team backend (FastAPI). The Start server forwards every
# request to it, so the backend can stay on the internal Docker network. Without API_URL the app
# runs on its validated JSON fixtures and mock services (demo mode) — no credentials needed.

############################
# 1) Build
############################
FROM node:22-bookworm-slim AS build
WORKDIR /app

# The project's lockfile is bun.lock, so dependencies are installed with bun; vite itself runs on Node.
RUN npm install -g bun@1 --no-fund --no-audit

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
# vite.config.ts defaults to Cloudflare; the image targets a plain Node server instead.
RUN NITRO_PRESET=node-server npx vite build

############################
# 2) Runtime
############################
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
# Team backend base URL, e.g. http://api:8000 (Compose) or http://host.docker.internal:8000. Empty = demo mode.
ENV API_URL=""

# Nitro bundles the server and its dependencies into .output — nothing else is needed at runtime.
COPY --from=build --chown=node:node /app/.output ./.output

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
