# hezarfen_frontend

SolidJS SPA for [hezarfen_backend](../../Rust/hezarfen_backend). Bun for tooling,
Vite for dev/build, `@solidjs/router` for lazy-loaded routes — no other runtime
dependencies.

## Run

```sh
bun install
bun run dev        # http://localhost:5173, proxies /api -> http://127.0.0.1:8080
```

Start the backend first (`cargo run` in the backend repo). The dev server
proxies `/api/*` to it, so the session cookie stays same-origin and CORS never
enters the picture.

## Build

```sh
bun run check      # typecheck
bun run build      # dist/
```

Serve `dist/` behind any reverse proxy that maps `/api/*` to the backend
(strip the `/api` prefix). To point the SPA at an absolute API origin instead,
set `VITE_API_URL` at build time.

## Shape

- `src/lib/api.ts` — typed client; every endpoint, one `ApiError` shape.
- `src/lib/auth.tsx` — session context; `/auth/me` fetched once, mutated in place.
- `src/lib/action.ts` — pending/error wrapper for mutations.
- `src/pages/*` — one file per route, lazy-loaded.

Mutations update resources from the server's response (`mutate`), never by
refetching — the UI reacts in the same frame the request resolves.
