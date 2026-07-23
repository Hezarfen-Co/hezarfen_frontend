# Build the SPA, then serve the static bundle with Bun (which also reverse-
# proxies /api to the backend — see server.ts). No nginx: one runtime, one
# tool, same-origin preserved.

FROM docker.io/oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM docker.io/oven/bun:1-slim AS serve
WORKDIR /app
# Only the built assets and the server script are needed at runtime; server.ts
# imports nothing but Bun built-ins, so there are no node_modules to copy.
COPY --from=build /app/dist ./dist
COPY server.ts ./server.ts

ENV PORT=5173
EXPOSE 5173
USER bun

# Healthcheck lives in compose.yaml (podman's OCI image format ignores a
# Containerfile HEALTHCHECK).
CMD ["bun", "run", "server.ts"]
