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
- Hezarfen backend running at `http://127.0.0.1:8080` (or proxied via Vite)

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

> **Proxy Note**: Vite server automatically proxies `/api/*` and WebSocket connections (`/ws/*`) to `http://127.0.0.1:8080`, preserving HttpOnly session cookies across same-origin calls.

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
