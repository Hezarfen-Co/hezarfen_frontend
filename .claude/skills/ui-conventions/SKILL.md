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

- **Pill standard (2026-09-26):** every toolbar / header control — search, filter chips, action buttons, "Sütunlar", the "İşlem" row-action trigger — is a pill: `rounded-full`, `text-[13px]`, `h-8` from `sm`, `h-10` below `sm` and on touch. Use `TOOLBAR_CONTROL` (one control) / `TOOLBAR_SLOT` (wrapper sizing nested buttons+links) / `TOOLBAR_CARD` from `src/components/ui/data-toolbar.tsx`. DataTable `actions`/`filters`, DataSection/DataToolbar slots and PageHeader `actions` already apply it — pass plain `<Button size="sm">` and never add `rounded-lg`/`rounded-md`/`h-9` overrides.
- Primary create/add is the default (filled) variant; secondary/import is `variant="outline"`. Filled buttons carry a transparent border with `bg-clip-padding` — never a border in the fill's own colour (it makes the button look bigger than its outlined neighbours).
- An active filter chip (a `DropdownSelect` with `labelPrefix` whose value is not its first option) gets `data-filter-active` and a primary border.
- Actions inside sub-panels must not duplicate section headers — primary create/add/assign actions go in the header `actions` prop of the parent disclosure or page header.

## Tables

- Application tables must use `src/components/ui/data-table.tsx` `DataTable`.
- Actions columns stay fixed at `w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap` to prevent localized headers like `"İŞLEMLER"` from changing their size.
- Table-page headers fold into the `DataTable` title/description/actions area; do not render a separate `PageHeader` above table-primary pages.
- Every list toolbar is one card (`TOOLBAR_CARD`), even when "Sütunlar" is its only control; its controls follow the pill standard above.
- Server lists fetch as you scroll (`createInfiniteList` + DataTable `infinite`, or `InfiniteSentinel` for card lists) only when the backend applies every filter the list offers (sorting is off there). Client tables use page numbers through `TablePagination`. Back from a detail page restores the page and scroll (`urlState`, `createScrollRestore`).
- Pages/domain components must not import or render `Table` primitives directly; only the `DataTable` wrapper and table primitive files may.
- Every list page uses one card: optional `Tabs` above, then `section.data-shell` holding the `DataTable` (its `title`/`description`/`actions`). Card-grid lists use `DataSection` from `src/components/ui/data-section.tsx` for the same header. No standalone `PageHeader`/`h1` above a list, and no row counts in descriptions (the pager shows them).

## Shared pickers & empty states

- Dropdowns: `Select` (drop-in for `<select>` + `<option>`, renders the app menu), `DropdownSelect` (options array), `SearchableSelect` (long lists). Never a raw `<select>`, `type="date"` input (use `DatePicker`) or an ad-hoc search `Input` (use `DataTableSearch`).
- Every search box says what it matches: pass `hint` (`DataTableSearch`),
  `filterHint` (`DataTable`) or `searchHint` (`DataToolbar`) — a short line
  shown under the field while it has focus. The text must name the fields the
  filter really reads; never promise a field it does not search.
- `UserSearchSelect` rows are two lines: display name, then `class · username`
  for a student picker (`role="student"`) and `username` otherwise — never the
  raw account uuid. Class names come from `src/lib/student-classes.ts`
  (`GET /classes/user/{id}`, teacher+, cached per tab); only ever call it for a
  bounded list of students.
- Confirmations and text prompts go through `ConfirmDialog`; never `window.confirm/prompt/alert`.
- Empty states: `EmptyState` (full panel, `kind` picks the unDraw scene) or `EmptyInline` (cards/charts). Scenes live in `src/assets/illustrations/` (license + slugs in its README); pixel glyphs come from `PixelIcon` (pixelarticons, MIT).

## Date/time & attendance

- Date/time product forms use shared `DatePicker` plus a separate `HH:mm` input. Backend schedule fields are UTC unix-millisecond values; backend rejects newly set past event/exam/session schedules with `400`. Use `GET /time` for server-clock-aware checks when accuracy matters.
- Lesson session roll call is teacher/manager workflow only. Students never self-mark lesson sessions; the session teacher or course manager marks enrolled students, and the session teacher's own presence row is manager-only per backend rules.
- Attendance status UI uses shared localized metadata: label, short detail text, semantic colors.

## Features

- **Note Import Assistant:** Raw PDF/TXT/MD converted to structured Markdown via `src/lib/note-importer.ts`. Noise (page numbers, headers/footers, watermarks) removed, PDF mid-sentence line wraps re-joined, headings (`##`) and bullet lists formatted, OCR-unreadable artifacts flagged with `⚠️ Some content may be unreadable due to OCR/extraction issues`. Never invent content or add fluff preamble. Lives in a dedicated `SidePanel` triggered from the Notes page header, right of the "Yeni Not" button.
- **Notes editor:** Personal notes open as full pages — `/notes/new` and `/notes/$id` (`NoteDocument`) — not side panels. Bodies are HTML written by `NoteRichEditor` (contentEditable, sticky toolbar, ⌘S save, ⌘K link, unsaved-changes blocker); course notes use the same editor inside `NoteForm`. Stored Markdown-ish bodies (imports, older notes) load through `toRichTextHtml`.
- **Rendering stored HTML:** anything a user wrote that reaches `innerHTML` (notes, messages, homework submissions) goes through `sanitizeRichText` / `toRichTextHtml` from `src/lib/rich-text.ts`. Card excerpts use `richTextExcerpt` (plain text), never `innerHTML`.
- **Drawing Canvas (`DrawCanvas`):** Freehand drawings saved as `.hzdraw.png` with embedded scene JSON metadata. Live drawing effects must guard `initialScene` against re-initializing during active strokes.
- **Whiteboard (`WhiteboardCanvas`):** Excalidraw-style, edge to edge on `/whiteboards/$id` — top-centre tool island (H/P/R/D/O/A/L/E shortcuts), left style island, board menu top-left (history, edit, lock/clear/close, delete), roster avatars + lock + invite top-right, status banner under the tools, zoom bottom-left; Space/scroll pans, Ctrl+scroll zooms. The board backend stores only an append-only log of opaque stroke payloads: shapes are baked into ordinary strokes (`src/lib/board-shapes.ts`), and the object eraser logs a marker payload whose `del` lists the removed sids (`encodeEraseMarkers`) — markers count toward the epoch stroke cap. A closed board cannot be reopened (backend by design); lock is the reversible pause. Never add a shape/text wire kind without a backend contract for it.
