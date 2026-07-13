# Hezarfen Frontend

SolidJS + TypeScript frontend for the Hezarfen REST API.

## Stack

- **SolidJS** + Vite
- **TanStack Router** (code-based route tree, lazy pages)
- **Kobalte + Tailwind CSS** UI primitives (shadcn-solid style)
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

The Vite server proxies `/api/auth`, `/api/users`, `/api/notes`, `/api/events`, `/api/exams`, `/api/courses`, `/api/marks`, `/api/time`, and `/api/health` to the backend so the HttpOnly session cookie stays same-origin while page URLs like `/notes` remain frontend routes on refresh.

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start Vite dev server |
| `bun run build` | Typecheck + production build |
| `bun run preview` | Preview production build |
| `bun run check` | Typecheck only |

## Roles

`student < teacher < manager < admin` — higher roles inherit lower capabilities. Registration always creates a `student`.

## Pages

| Path | Access | Description |
|---|---|---|
| `/login`, `/register` | Guests | Authentication |
| `/` | Authenticated | Dashboard with widgets |
| `/profile` | Authenticated | Edit personal info (name, email, phone, birth date) |
| `/notes` | Student+ | Personal notes CRUD |
| `/events`, `/events/:id` | Student+ | Event list & detail (create/edit: teacher+) |
| `/exams` | Student+ | Exam list grouped by course (accordion) |
| `/exams/:id` | Student+ | Exam detail, questions, grading, statistics (teacher+) |
| `/exams/:id/live` | Teacher+ | Live monitor / final state roster with pagination & sorting |
| `/exam-room/:id` | Student+ | WebSocket-based real-time exam room (auto-save, timer, expiry) |
| `/courses` | Student+ | Course list & exam creation (teacher+) |
| `/guide` | Authenticated | App usage guide |
| `/admin/users` | Admin | User management |

## Features

- **Exam lifecycle**: create (scheduled/async/unscheduled), questions (multiple-choice / text), real-time WebSocket exam room, auto-submit on expiry, teacher grading
- **Live monitor**: 2-second polling during active exams, static final state view after exam ends, pagination (10/page), column sorting
- **Statistics**: graded count, average/min/max marks on exam detail
- **Answer sheet**: teacher review of student answers with correct/wrong highlighting
- **Profile editing**: update display name, email, phone, birth date
- **i18n**: full Turkish / English interface

## Project Structure

```
src/
├── api/           # API client, types, endpoint functions
├── components/    # Reusable UI components
│   ├── exams/     # Exam card, form, questions panel, answer sheet, WS room
│   ├── layout/    # Side nav, page header, role guards
│   ├── ui/        # Design system (Button, Badge, Table, Input, etc.)
│   └── users/     # Profile form, user table
├── i18n/          # Message keys + EN/TR dictionaries
├── lib/           # Utilities (format, cn, roles, exam-labels)
├── pages/         # Route-level page components
├── routes/        # TanStack Router tree
└── stores/        # Auth, preferences (locale, theme) contexts
```
