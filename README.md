# Hezarfen Frontend

Hezarfen's school dashboard and learning portal, built with SolidJS, TypeScript, TanStack Router, Tailwind CSS, and shadcn-solid components. The dashboard is a read-only status board; other pages provide role-scoped learning and school-management workflows. The interface supports Turkish and English.

## Local development

Install [Bun](https://bun.sh/) and run:

```bash
bun install
bun run dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` and WebSocket traffic to `https://hezarfen-backend.dizey.sh` by default. To use a local backend:

```bash
BACKEND_ORIGIN=http://127.0.0.1:7656 bun run dev
```

The proxy keeps browser requests and session cookies on the frontend origin. A backend account is needed for authenticated pages. For local testing, `.env.local` can hold `VITE_DEV_AUTOLOGIN_USERNAME` and `VITE_DEV_AUTOLOGIN_PASSWORD`, plus optional `VITE_DEV_AUTOLOGIN_SCHOOL`. Dev auto sign-in runs only in Vite development mode. `VITE_DEMO_LOGIN_USERNAME` and `VITE_DEMO_LOGIN_PASSWORD` instead prefill the demo login at build time; those values **are included in the built bundle**, so use only demo credentials.

### Checks

```bash
bun run check          # TypeScript
bun run test           # Vitest unit tests
bun run build          # TypeScript + production bundle
bun run test:e2e       # Playwright; starts Vite and requires a live backend
bun run test:contract  # Live API contract tests; requires CONTRACT_BASE_URL
```

The Playwright and live contract suites are local, on-demand checks. The push workflow runs typechecking, unit tests, and the production build.

## Application map

| Area | Routes | Purpose |
| --- | --- | --- |
| Home and account | `/`, `/profile/me`, `/guide` | Status dashboard, profile, and in-app guide. |
| Learning | `/courses`, `/courses/$id`, `/instances/$id`, `/homework`, `/exams`, `/notes`, `/whiteboards` | Catalog courses, class-specific course instances, assignments, exams, notes, and boards. |
| Questions and AI | `/questions`, `/question-bank`, `/ai/studio`, `/ai/study`, `/ai/insights` | Community questions, staff question bank, AI note studio, study assistant, and insights. |
| School life | `/calendar`, `/events`, `/appointments`, `/meals`, `/messages` | Calendar, events, appointments, meal menus, and messages. |
| Personal progress | `/marks`, `/pomodoro`, `/payments` | Student marks and focus sessions; parent payment statements. |
| School management | `/management/classes`, `/management/students`, `/management/teachers`, `/management/student-attendance`, `/management/student-marks`, `/management/pomodoros` | Classes, rosters, and student progress. |
| Administration | `/management/academic-years`, `/management/terms`, `/management/holidays`, `/management/staff-work`, `/management/settings`, `/management/payments`, `/admin/users` | Academic calendar, staff work, settings, payments, and users. |

There are separate `parent`, `student`, `teacher`, `manager`, and `admin` experiences, plus a platform builder session under `/builder`. Pages and data are scoped by role and enabled school modules. See [the sitemap](docs/frontend/sitemap.md) for the complete route and access map.

A course at `/courses/$id` is a catalog record. An instance at `/instances/$id` attaches that course to a class and owns its enrollment, sessions, homework, exams, and roll call. Keep that distinction when extending API calls or UI.

## Code layout

| Path | Contents |
| --- | --- |
| `src/api/` | Domain-based API functions and endpoint tests. Pages use this layer rather than calling `fetch` directly. |
| `src/components/` | Shared UI, layout, and domain components, including side panels. |
| `src/pages/` | Page components, loaded lazily by the router. |
| `src/routes/router.tsx` | Route definitions and redirects. |
| `src/i18n/` | Turkish and English messages. |
| `src/stores/` | Shared SolidJS contexts. |
| `docs/` | Product, UI, auth, frontend, and backend notes. |

SolidJS components execute once. Use signals and memos for reactive state; do not assume React-style rerenders. Repository conventions and area-specific skills are listed in [AGENTS.md](AGENTS.md).

## Container and deployment

Use Podman:

```bash
podman compose up -d --build
podman compose logs -f frontend
podman compose down
```

The `Containerfile` builds the app with Bun, then `server.ts` serves `dist/` and proxies `/api/*`, including the exam-room WebSocket. `compose.yaml` uses host networking. The image defines defaults for `BACKEND_ORIGIN`, `HOST`, and `PORT`; production overrides them with an operator-owned `~/hezarfen_frontend/hezarfen_frontend.env` created from `deploy/hezarfen_frontend.env.example`. Set `HOST=127.0.0.1` when a reverse proxy on the same server is the public entry point. Keep the env file private with mode `0600`.

The systemd user unit at `deploy/hezarfen_frontend_compose.service` starts the stack. After changing its env file, recreate the container with `systemctl --user restart hezarfen_frontend_compose` so it reads the new values. A plain `podman restart` retains the old environment.

On pushes to `main`, `.github/workflows/main.yml` checks, tests, builds, and deploys an image over SSH, then verifies the new container. It requires repository secrets `SSH_PRIVATE_KEY`, `SSH_HOST`, and `SSH_USER`, plus Podman and a compose provider on the server. The operator creates the production env file once; the workflow does not overwrite it. `workflow_dispatch` redeploys the latest successful build artifact.

## Contributing

Keep changes reviewable and use Bun for JavaScript and TypeScript tooling. Before a commit, run `bun run build`; run relevant tests for behavior changes. Commit messages use the repository's `type: emoji short summary` format with English details. See [AGENTS.md](AGENTS.md) and the `commit-workflow` skill for the full rules.
