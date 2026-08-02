---
name: ui-conventions
description: hezarfen_frontend UI conventions — SidePanel vs full-page, header button sizing/radius, DataTable-only tables, date/time forms, attendance/roll-call rules, Note Import Assistant, and DrawCanvas. Load before building or restyling pages, tables, headers, dialogs, forms, or the notes/draw features.
---

# UI conventions

## Naming & file structure

- **One component per file.** Never two sibling components in one file. Exception:
  shadcn-solid wrapper files under `src/components/ui/` may export the documented
  compound API from one file (`Dialog`, `DialogContent`, `DialogHeader`, …).
- File name = component name in kebab-case; exported component is PascalCase
  (`note-card.tsx` → `NoteCard`). Colocated files keep the base name
  (`note-card.types.ts`, `note-card.test.tsx`).
- Same-domain components share a folder: `components/notes/`, `events/`, `exams/`,
  `users/`, `attendance/`, `courses/`, `marks/`, `sessions/`, `messages/`,
  `homework/`, `appointments/`, `layout/`, `ui/`.
- Cross-cutting app state lives in `src/stores/` (`auth-context.tsx`,
  `preferences-context.tsx`) — context providers only, never domain components.
  School-policy lists (exam kinds, attendance statuses, grade bands) come from
  `getSettings()` in a `createResource`, never hardcoded.
- **API layer** lives under `src/api/` — domain folders, one verb-first file per
  endpoint, `fetch` only in `client.ts`, mandatory per-domain tests. Full rules and
  the test contract: **api-layer** reference.

Active project reference docs (read the relevant one before changing that area):
- `docs/ui/navigation-patterns.md` — interaction rules, role scope, side-panel/full-page decisions, dashboard structure.
- `docs/ui/ui-redesign-tokens.md` — visual density, radius, table, side-panel, status UI, dashboard card conventions.
- `docs/auth/role-scope-matrix.md` — role access matrix for pages/nav/dashboard cards.
- `docs/frontend/frontend-next-steps.md` — completed audit summary plus active follow-up notes.
- `docs/backend/backend-ui-alignment-plan.md` — completed archive; not active work unless backend scope changes.

## Layout & panels

- Durable resources use full detail pages. Short create/edit/filter work uses `SidePanel`. Destructive actions use confirm dialogs.
- Disclosure sections may defer mounting (request savings) or stay mounted (state preservation) — choose deliberately; avoid hidden heavy requests unless needed.

## Buttons

- Header create actions: compact icon+label, consistent size and current radius.
- Page header primary create/add: `size="sm" class="min-w-[7.5rem] rounded-lg"`. Secondary/import: `variant="outline"` with the same size/class.
- Section/sub-panel header actions: `variant="outline" size="sm" class="rounded-lg"` unless matching a page header button.
- Actions inside sub-panels must not duplicate section headers — primary create/add/assign actions go in the header `actions` prop of the parent disclosure or page header.

## Tables

- Application tables must use `src/components/ui/data-table.tsx` `DataTable`.
- Actions columns stay fixed at `w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap` to prevent localized headers like `"İŞLEMLER"` from changing their size.
- Table-page headers fold into the `DataTable` title/description/actions area; do not render a separate `PageHeader` above table-primary pages.
- Search inputs, dropdown filters, filter buttons, and column controls share the same compact height/radius (`h-8 rounded-lg`, `text-[13px]`) unless the shared component changes the standard globally. Page-header primary actions may stay `h-9`.
- Pages/domain components must not import or render `Table` primitives directly; only the `DataTable` wrapper and table primitive files may.

## Date/time & attendance

- Date/time product forms use shared `DatePicker` plus a separate `HH:mm` input. Backend schedule fields are UTC unix-millisecond values; backend rejects newly set past event/exam/session schedules with `400`. Use `GET /time` for server-clock-aware checks when accuracy matters.
- Lesson session roll call is teacher/manager workflow only. Students never self-mark lesson sessions; the session teacher or course manager marks enrolled students, and the session teacher's own presence row is manager-only per backend rules.
- Attendance status UI uses shared localized metadata: label, short detail text, semantic colors.

## Features

- **Note Import Assistant:** Raw PDF/TXT/MD converted to structured Markdown via `src/lib/note-importer.ts`. Noise (page numbers, headers/footers, watermarks) removed, PDF mid-sentence line wraps re-joined, headings (`##`) and bullet lists formatted, OCR-unreadable artifacts flagged with `⚠️ Some content may be unreadable due to OCR/extraction issues`. Never invent content or add fluff preamble. Lives in a dedicated `SidePanel` triggered from the Notes page header, right of the "Yeni Not" button.
- **Drawing Canvas (`DrawCanvas`):** Freehand drawings saved as `.hzdraw.png` with embedded scene JSON metadata. Live drawing effects must guard `initialScene` against re-initializing during active strokes.
