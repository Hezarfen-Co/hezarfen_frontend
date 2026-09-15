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

# THE deployment defaults, and the only place they are written. server.ts reads
# all three from the environment and refuses to boot without them, compose's
# healthcheck asks the container for PORT instead of repeating a number, and the
# deploy pipeline reads the port back out of the running container. Override any
# of them in hezarfen_frontend.env — env_file wins over these image values.
# Nothing is EXPOSEd: the service runs with host networking, so it binds the
# host's interface directly and no port mapping exists.
ENV PORT=5173 \
    HOST=0.0.0.0 \
    BACKEND_ORIGIN=http://127.0.0.1:7656
USER bun

# Healthcheck lives in compose.yaml (podman's OCI image format ignores a
# Containerfile HEALTHCHECK).
CMD ["bun", "run", "server.ts"]
