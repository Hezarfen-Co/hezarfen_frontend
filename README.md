# Hezarfen Frontend

SolidJS + TypeScript frontend for the Hezarfen REST API.

## Stack

- **SolidJS** + Vite
- **TanStack Router** (code-based route tree, lazy pages)
- **shadcn-solid style UI** (Kobalte Button + Tailwind primitives)
- Session cookie auth via Vite dev proxy (same-origin)

## Prerequisites

- Node.js 20+
- Hezarfen backend running at `http://127.0.0.1:8080`

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite server proxies `/auth`, `/users`, `/notes`, `/events`, `/exams`, and `/health` to the backend so the HttpOnly session cookie stays same-origin.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run check` | Typecheck only |

## Roles

`student < teacher < manager < admin` — higher roles inherit lower capabilities. Registration always creates a `student`.

## Pages

| Path | Access |
|---|---|
| `/login`, `/register` | Guests |
| `/` | Authenticated |
| `/notes` | Student+ |
| `/events`, `/events/:id` | Student+ (create/edit: teacher+) |
| `/exams`, `/exams/:id` | Student+ (create/grade: teacher+) |
| `/admin/users` | Admin |
