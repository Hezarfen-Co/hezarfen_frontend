# Hezarfen Frontend

A modern, high-performance **SolidJS + TypeScript** web application for the Hezarfen Campus & Learning Management System. Built with Vite, TanStack Router, Tailwind CSS, and a rich, accessible dark mode design system.

---

## 🚀 Key Highlights & UI/UX Experience

- **Çelebi AI Assistant**: Top-bar instant AI study and campus guide accessible from every page (`IconSparkles`).
- **Smart Notebook & Import Assistant**: Upload PDF, TXT, or MD files and automatically extract clean Markdown notes (OCR warning, split line joining, header stripping).
- **Freehand Drawing Canvas (`.hzdraw`)**: Unbounded pannable/zoomable drawing canvas with stroke smoothing, dark mode grid paper, and PNG scene JSON metadata embedding.
- **Question Bank & Verified Solutions**: Question repository (`/questions`) supporting written/multiple-choice answers, teacher verification badges, and subject taxonomy.
- **Live Exam Room & Real-Time Monitor**: Server-clock-synchronized countdown timer (`GET /time`), WebSocket + REST autosave, teacher SSE live monitoring, and answer sheet grading.
- **Unified Sky-Blue Container (`data-shell`)**: Cohesive, elegant dark mode surfaces (`border-sky-500/15 bg-sky-500/[0.025]`) across Courses, Exams, Events, Calendar, and Guide pages.
- **Redesigned Tab System**: Stationary tab dimensions (zero layout shifts), glowing dark mode halo rings (`dark:shadow-[0_0_16px_rgba(255,255,255,0.08)]`), dynamic alternating accent lines, and perfectly aligned icon + text triggers.
- **Çelebi Primary Button Styling**: Hairline borders, translucent fill (`bg-primary/15`), subtle rings, and clean hover micro-interactions.

---

## 🛠️ Stack & Architecture

- **Core**: SolidJS 1.8+ & TypeScript 5+ (scaffolded with Vite 6)
- **Routing**: TanStack Router (`@tanstack/solid-router`, code-based route tree, route-level code splitting via `lazy()`)
- **UI Primitives**: Custom **shadcn-solid** wrappers under `src/components/ui/` styled with Tailwind CSS (using `clsx` + `tailwind-merge` + `cva`)
- **API Layer**: Domain-driven `src/api/<domain>/` functions using `fetch` inside SolidJS `createResource` boundaries. Pages never call `fetch` directly.
- **Testing**: Vitest with 100% endpoint test coverage (`src/api/__tests__/`) and custom `mockFetch` utilities.
- **Runtime Targets**: Under ~70KB gzipped bundle size for lightning-fast loads.

---

## 📦 Prerequisites & Setup

- **Node.js** 20+ or **bun** (recommended)
- A Hezarfen backend to talk to — the deployed frontend proxies `/api/*` to it, so `https://hezarfen.dizey.sh` is enough in a browser; for a direct backend (dev) door use `https://hezarfen-backend.dizey.sh`, or `BACKEND_ORIGIN=http://127.0.0.1:7656` against a backend on the same machine

### Installation & Development

```bash
# Install dependencies
bun install

# Start Vite development server
bun run dev

# Run unit tests
bun run test

# Typecheck and build production bundle
bun run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **Proxy Note**: Vite server and the production Bun server proxy `/api/*` and WebSocket connections to `BACKEND_ORIGIN` (default: `http://127.0.0.1:7656`, the co-located backend's loopback port), preserving HttpOnly session cookies across same-origin calls. Point it elsewhere with `BACKEND_ORIGIN=… bun run dev`, or with `BACKEND_ORIGIN` in `hezarfen_frontend.env` for the compose stack (see "Run in a container" below).

---

## 🐳 Run in a container (podman)

```bash
podman compose up -d --build   # build + start, http://127.0.0.1:5173
podman compose logs -f frontend
podman compose down            # stop
```

The `Containerfile` is a two-stage build: `bun install --frozen-lockfile` plus `bun run build` produce `dist/`, and `oven/bun:1-slim` serves it with `server.ts` — which also reverse-proxies `/api/*` (plain HTTP and the exam-room WebSocket) to `BACKEND_ORIGIN`. No nginx, no node_modules at runtime, no state: one container and no volumes. It runs with `network_mode: host`, so it shares the host's loopback and reaches a backend published on `127.0.0.1:7656` exactly as a host process would (a bridge network would resolve `127.0.0.1` to the container itself). Host networking means no port mapping: the app binds the host's interface directly, so set `HOST=127.0.0.1` and let the reverse proxy on the same loopback be the only door.

**Knobs live in two places and are never mixed.** On a laptop nothing is required: with no env file the app falls back to its own defaults (`BACKEND_ORIGIN=http://127.0.0.1:7656`, `HOST=0.0.0.0`, `PORT=5173`), so the `up` above works with zero extra files. On a server the operator copies `deploy/hezarfen_frontend.env.example` to `$HOME/hezarfen_frontend/hezarfen_frontend.env`, `chmod 0600` it and edits it — nothing automated creates, overwrites or uploads that file. The service declares it as `env_file:`, so **every key it carries reaches the container with no extra flag**; nothing else is interpolated from it, and the only compose-level variable is `HEZARFEN_TAG`, which the deploy owns in `stack.env`.

Environment values are read when the container **starts**: after editing the file, recreate (`podman compose up -d`, or `systemctl --user restart hezarfen_frontend_compose`). `podman restart` keeps the old environment.

`deploy/hezarfen_frontend_compose.service` is a systemd **user** unit that brings the stack up at boot:

```bash
podman compose --env-file ~/hezarfen_frontend/hezarfen_frontend.env \
               --env-file ~/hezarfen_frontend/stack.env up -d --no-build
```

`--env-file` feeds both compose's interpolation and — through `env_file:` — the container; the second file is compose-owned and carries `HEZARFEN_TAG` (a later `--env-file` wins for duplicate keys). Because the unit passes `--no-build`, the image must already exist on the host (`podman compose build`, or `podman load` of a tarball shipped from elsewhere). After an env change: `systemctl --user restart hezarfen_frontend_compose`.

Deploying is GitHub Actions' job, not the server's. `.github/workflows/main.yml` typechecks (`tsc --noEmit`, its own runner, parallel with the rest), runs the vitest suite, builds the SPA, packs `dist/` + `server.ts` into the runtime image (`deploy/Containerfile.runtime`), and ships the image tarball together with `compose.yaml`, the `hezarfen_frontend_compose.service` unit and a `tag` file as the run's artifact. The deploy job loads that image on the server and starts the stack with `podman compose up -d --no-build`; the tag travels in a deploy-owned `stack.env`, so a release never rewrites the operator's knobs file. A health gate protects the swap: the new container must serve the SPA shell and must be *this* build's image, otherwise the deploy rolls back to `previous_tag` (and on a first deploy stops the stack instead). The operator's only manual step is writing the env file once (above).

It needs three repository secrets — `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`, the same three names the backend deploy uses — plus `loginctl enable-linger` for the deploy user. `workflow_dispatch` (Actions → Run workflow, or `gh workflow run main.yml --ref main`) redeploys the newest green build without re-running the suite, which is the door to use when only the server side changed.

---

## 👥 Role Scope Matrix

`student < teacher < manager < admin` — Higher roles inherit lower capabilities. Public registration creates a `student`.

| Role | Access & Capabilities |
|---|---|
| **Student (`student`)** | Personal notebook, PDF import, drawing canvas, enrolled courses, live exam room, question bank, pomodoro focus log, personal report card & attendance history. |
| **Teacher (`teacher`)** | Course/study creation, student enrollment, lesson session roll call, exam question authoring, live exam monitoring, answer sheet grading, and solution verification. |
| **Manager (`manager`)** | Academic settings, term definitions, attendance reports, global course/exam oversight, and staff work logs. |
| **Admin (`admin`)** | Global management scope across all users, role assignments, system policies, settings, and terms. |

---

## 🗺️ Page Routes & System Navigation

| Path | Access Scope | Description |
|---|---|---|
| `/login`, `/register` | Guests | Authentication with same-origin cookie management. |
| `/` | Authenticated | Read-only observation dashboard with role-scoped portal cards, attention items, and upcoming events. |
| `/guide` | Authenticated | Redesigned product guide featuring role scope matrix, 6 core feature cards, and pro tips. |
| `/profile` | Authenticated | User profile management (display name, email, phone, birth date). |
| `/notes` | Student+ | Personal notebook with paper-style cards, Note Import Assistant (PDF/TXT), reader drawer, file attachments, and `.hzdraw` live canvas. |
| `/questions`, `/questions/:id` | Student+ | Community Question Bank with solution authoring and teacher verification. |
| `/courses`, `/courses/:id` | Student+ | Course catalog, student enrollment, curriculum subjects, homework assignments, and lesson session roll call. |
| `/exams`, `/exams/:id` | Student+ | Exam list and details, subject-tagged questions, draft/publish controls, and grading statistics. |
| `/exam-room/:id` | Student+ | WebSocket real-time exam room with autosave, server timer (`/time`), and automatic turn-in on expiry. |
| `/exams/:id/live` | Teacher+ | Live exam monitor over SSE/polling with answer sheets, auto-score suggestions, and inline grading. |
| `/events`, `/events/:id` | Student+ | Campus event list and detail views with search filters and attendance roster. |
| `/calendar` | Student+ | Full calendar view with sky-blue container, event & exam markers, and day detail inspection. |
| `/marks` | Student+ | Report card with weighted exam average calculations and course breakdown. |
| `/messages` | Student+ | Messaging portal with folder navigation, unread badges, and micro-animations. |
| `/pomodoro` | Student | Student focus log with server-stamped session tracking. |
| `/admin/users` | Admin | User account administration and role assignment. |

---

## 🎨 UI/UX Design System Tokens

- **Data Shell Surface**: Subtle sky-blue background container (`border-sky-500/15 bg-sky-500/[0.025]`) used across data-heavy views for visual cohesion.
- **Domain Accent Colors**: Centralized single source of truth (`src/lib/domain-colors.ts`) mapping domain colors exclusively to hairline borders and ring highlights (amber for Notes, violet for Messages, rose for Exams, emerald for Events, sky for Courses, cyan for Questions, teal for Marks).
- **Tab Indicators**: Recessed list tracks, stationary pill triggers, halo ring glow outlines, and alternating accent lines.
- **Button Styling**: Çelebi-themed translucent fill (`bg-primary/15`), hairline borders, and subtle rings (`ring-1 ring-primary/25`).
- **Invisible Scrollbars**: Functional scrolling without visible scrollbar clutter across all browsers (`scrollbar-width: none`).

---

## 📁 Project Directory Structure

```
src/
├── api/                # Endpoint functions organized by domain (notes, exams, courses, etc.)
│   └── __tests__/      # Vitest endpoint tests (100% API coverage)
├── components/         # Domain & UI components
│   ├── exams/          # Exam cards, forms, live monitor, WS room
│   ├── layout/         # AppShell, PageHeader, Sidebar, RouteGuard
│   ├── notes/          # Note cards, reader panel, file attachment manager
│   ├── ui/             # Design system (Button, Badge, DataTable, SidePanel, Tabs, etc.)
│   └── users/          # User search, profile form, admin user table
├── i18n/               # Localization dictionaries (TR / EN) and MessageKey types
├── lib/                # Shared utilities (domain-colors, note-importer, stroke-smoothing, etc.)
├── pages/              # Lazy-loaded page components for TanStack Router
├── routes/             # TanStack Router route tree definition
└── stores/             # Cross-cutting contexts (AuthContext, PreferencesContext)
```

---

## 📜 Commit & Quality Workflow

All contributions adhere to the strict repository rulebook (`AGENTS.md`):

1. **Pre-commit Check**: `bun run test` (35 test files, 238 tests) and `bun run build` (`tsc --noEmit && vite build`) must pass green before committing.
2. **Conventional Commits**: Format `type: emoji short summary` with technical bullet details written in English.
