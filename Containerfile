FROM docker.io/oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM docker.io/library/debian:trixie-slim AS serve

RUN apt-get update && \
    apt-get install -y --no-install-recommends nginx curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    useradd --system --uid 10001 hezarfen && \
    mkdir -p /var/cache/nginx /var/lib/nginx /var/log/nginx && \
    chown -R hezarfen:hezarfen /var/cache/nginx /var/lib/nginx /var/log/nginx /usr/share/nginx/html && \
    rm -f /etc/nginx/sites-enabled/default

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN sed -i 's|pid /run/nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf

USER hezarfen

ENV PORT=5173

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
