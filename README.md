# Hezarfen Frontend

SolidJS + TypeScript frontend for the Hezarfen REST API.

## Stack

- **SolidJS** + Vite
- **TanStack Router** (code-based route tree, lazy pages)
- **shadcn-solid style** UI primitives under `src/components/ui/`
- Session cookie auth via Vite dev proxy (same-origin)
- **bun** package manager
- i18n with EN/TR locale switching

## Prerequisites

- Node.js 20+ (or bun)
- Hezarfen backend running at `http://127.0.0.1:8080`

## Setup

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

The Vite server proxies `/api/*` to the backend so the HttpOnly session cookie stays same-origin while page URLs like `/notes` remain frontend routes on refresh.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Typecheck + production build |
| `bun run preview` | Preview production build |
| `bun run check` | Typecheck only |

## Roles

`student < teacher < manager < admin` — higher roles inherit lower capabilities. Registration always creates a `student`.

Role-based UI rules:

- `student`: own/enrolled/related courses, exams, marks, attendance, and notes.
- `teacher`: teaching, grading, session, attendance, event, and work-log controls where allowed.
- `manager`: management pages such as settings, terms, reports, and broader school operations.
- `admin`: global management scope for courses, exams, users, settings, and terms.

Dashboard and table summaries must use the same role scope as the related page. Admin views global data; non-admin roles should not accidentally see global course/exam scope.

## Pages

| Path | Access | Description |
|---|---|---|
| `/login`, `/register` | Guests | Authentication |
| `/` | Authenticated | Role-scoped, observation-only dashboard |
| `/profile` | Authenticated | Edit personal info (name, email, phone, birth date) |
| `/notes` | Student+ | Personal notes CRUD |
| `/events`, `/events/:id` | Student+ | Event list & detail (create/edit: teacher+) |
| `/exams` | Student+ | Exam table with role-scoped course filtering |
| `/exams/:id` | Student+ | Exam detail, questions, grading, statistics (teacher+) |
| `/exams/:id/live` | Teacher+ | Live monitor / final state roster with pagination & sorting |
| `/exam-room/:id` | Student+ | WebSocket-based real-time exam room (auto-save, timer, expiry) |
| `/courses` | Student+ | Course table; create/edit flows for teacher+ |
| `/courses/:id` | Student+ | Course detail, exams, roster, lesson sessions, and roll call tools |
| `/guide` | Authenticated | App usage guide |
| `/admin/users` | Admin | User management |

## Features

- **Exam lifecycle**: create (scheduled/async/unscheduled), questions (multiple-choice / text), real-time WebSocket exam room, auto-submit on expiry, teacher grading
- **Live monitor**: 2-second polling during active exams, static final state view after exam ends, pagination (10/page), column sorting
- **Statistics**: graded count, average/min/max marks on exam detail
- **Answer sheet**: teacher review of student answers with correct/wrong highlighting
- **Profile editing**: update display name, email, phone, birth date
- **Dense tables**: toolbar search/filter, subtle column separators, narrow centered three-dot row actions
- **Side panels**: quick create/edit workflows without losing list context
- **Course sessions**: right-panel session creation and paginated roll call panels
- **Attendance UI**: localized status labels with explanatory detail text and semantic colors
- **Role-scoped dashboard**: read-only summaries and KPIs by current role
- **i18n**: full Turkish / English interface

## UI Patterns

- Durable resources use full detail pages with breadcrumbs.
- Short create/edit/filter work uses `SidePanel`.
- Destructive actions use confirm dialogs.
- Data-heavy views use `DataToolbar`, `DataTableFrame`, `.data-table`, and `TableRowActions`.
- Large list pages should use server-side pagination/search/filtering when the backend supports it; client-side slicing is only acceptable for small or temporary datasets.
- Date fields use the shared `DatePicker`; date-time flows pair it with an `HH:mm` input.
- Disclosure sections either defer hidden content for request savings or preserve mounted content when local state should not reset.

## Docs

- `docs/frontend-next-steps.md` — active backlog and role-based UI audit plan.
- `docs/navigation-patterns.md` — interaction, dashboard, role scope, and table action rules.
- `docs/ui-redesign-tokens.md` — visual density, table, typography, and component conventions.
- `docs/backend-ui-alignment-plan.md` — completed backend alignment archive.

## Project Structure

```
src/
├── api/           # API client, types, endpoint functions
├── components/    # Reusable UI components
│   ├── exams/     # Exam card, form, questions panel, answer sheet, WS room
│   ├── layout/    # Side nav, page header, role guards
│   ├── ui/        # Design system (Button, Badge, Table, SidePanel, row actions, etc.)
│   └── users/     # Profile form, user table
├── i18n/          # Message keys + EN/TR dictionaries
├── lib/           # Utilities (format, cn, roles, exam-labels)
├── pages/         # Route-level page components
├── routes/        # TanStack Router tree
└── stores/        # Auth, preferences (locale, theme) contexts
```
