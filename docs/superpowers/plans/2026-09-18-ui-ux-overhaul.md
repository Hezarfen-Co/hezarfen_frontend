# UI/UX Overhaul — Implementation Plan

Spec: `docs/superpowers/specs/2026-09-18-ui-ux-overhaul-design.md`
Order: Layer A task by task, one commit each; Layer B and C are outlined and
get their own detailed plan when A lands.

Every task: load `solidjs-pitfalls` + `ui-conventions` first; `bun run build`
(= `tsc --noEmit && vite build`) and `bun run test` must pass before commit
(`commit-workflow`).

## Layer A

### 1. Stop silent list truncation (events, exams, admin users)
- **Files:** `src/pages/events-page.tsx`, `src/pages/exams-page.tsx`,
  `src/pages/admin-users-page.tsx`, their tests if present
- **Do:**
  1. Run `check-api-contract` for `GET /events`, `/exams`, `/users`: confirm
     `limit`/`offset` + `total` (and which filters are server-side).
  2. Replace `getX({ limit: N })` with `loadListPage` (`src/lib/list-page.ts`):
     server mode when no client-only filter is active, client mode otherwise.
  3. Where client mode still fetches everything, fetch without `limit` (full
     `items`) instead of a cap.
  4. Grep the remaining `limit: 100|200` caps and list them in the commit body
     as follow-ups; do not fix them all in this task.
- **Verify:** unit test for each page's resource with a mocked `total` > page
  size shows pagination reaching the last page; `bun run build`.
- **Done when:** no list on these three pages can hide rows beyond a cap.

### 2. Confirm before emptying trash
- **Files:** `src/pages/messages-page.tsx`, `src/i18n/messages.ts`
- **Do:** wrap `handleEmptyTrash` behind `ConfirmDialog` showing the item
  count; destructive variant.
- **Verify:** test — clicking "empty trash" opens the dialog and no
  `deleteMessageById` call happens until confirm.
- **Done when:** permanent deletion always needs a second click.

### 3. In-app back navigation
- **Files:** `src/components/layout/app-shell.tsx`, new
  `src/lib/back-target.ts` (+ test)
- **Do:**
  1. Track whether the session has an in-app history entry (router history
     length / a flag set on first client navigation).
  2. If yes → `history.back()`; if no → navigate to the route's parent
     (derived from pathname segments, falling back to `/`).
- **Verify:** unit test for the parent derivation (`/exams/42` → `/exams`,
  `/instances/7` → its hub); manual: open a detail URL in a fresh tab, press
  back, stay in the app.
- **Done when:** the back button never leaves the app.

### 4. Shared breadcrumbs on every detail page
- **Files:** new `src/components/layout/breadcrumbs.tsx` (+ test); the detail
  pages: event, homework, meal, class, question, whiteboard, admin-user
  (course, exam, instance: migrate their inline crumbs to the component)
- **Do:** component takes `{ label, to? }[]`; hub labels come from
  `nav-items.ts`; render in `PageHeader` slot; last crumb is `aria-current="page"`.
- **Verify:** component test (links, aria-current); `rg -l Breadcrumbs src/pages`
  lists all 10 detail pages.
- **Done when:** every durable detail page shows hub → resource.

### 5. Reproduce and contain page-level errors (spec A6)
- **Files:** `src/app.tsx` or the shell route, possibly the
  `createResource` keep-latest wrapper
- **Do:**
  1. Reproduce: mock a failing list on `classes-page` in a test and check
     whether the root `RootErrorFallback` renders.
  2. If confirmed, add an `ErrorBoundary` inside the shell around the route
     outlet (keeps nav), with retry = `reset()`.
  3. If not confirmed, record that in the spec and drop the task.
- **Verify:** the reproduction test now renders the shell + inline error.
- **Done when:** one page's failure no longer blanks the whole app.

### 6. One data-state contract
- **Files:** new `src/components/ui/data-state.tsx` (+ test),
  `src/components/ui/data-table.tsx`, `src/pages/dashboard-page.tsx`,
  `src/pages/calendar-page.tsx`, `src/i18n/messages.ts`
- **Do:**
  1. `DataState` renders loading (skeleton) / empty / no-results (with
     "clear filters" callback) / error (`ErrorAlert` + retry).
  2. `DataTable`: distinct no-results copy + clear-filters action.
  3. Dashboard: replace `quiet()` swallowing with a per-panel inline error.
  4. Calendar: show loading until sources resolve; show which feed failed.
- **Verify:** tests for each state; dashboard test with one failing source
  shows that panel's error and the rest of the board.
- **Done when:** failure never reads as "no data".

### 7. SidePanel dirty guard + save toast
- **Files:** `src/components/ui/side-panel.tsx` (+ test), `src/i18n/messages.ts`,
  then 3 pilot forms (class create, meal create, exam create)
- **Do:**
  1. Add optional `dirty` accessor; on Esc/outside click/close while dirty,
     show a discard confirm.
  2. Pilot forms pass `dirty` and call `showToast` on success.
  3. List the remaining ~47 panels as follow-up; migrate in batches later.
- **Verify:** SidePanel test — dirty + Esc keeps panel open and shows confirm.
- **Done when:** pilot forms cannot lose input by accident.

### 8. Field-level errors (pilot)
- **Files:** `src/components/ui/input.tsx`, `textarea.tsx`, `select.tsx`,
  `label.tsx`, same 3 pilot forms
- **Do:** `error` prop → `aria-invalid` + `aria-describedby` + message under
  the field; map server validation errors to fields where the API returns a
  field name (confirm response shape with `check-api-contract`).
- **Verify:** component test for aria wiring.
- **Done when:** pilot forms show errors next to the field.

### 9. Accessibility pass
- **Files:** `src/components/layout/command-palette.tsx`,
  `src/components/ui/toast.tsx`, `side-panel.tsx`, `dialog.tsx`,
  `date-picker.tsx`, the 12 unlabeled icon buttons from the audit,
  `app-shell.tsx` (skip link), `src/i18n/messages.ts`
- **Do:** combobox/listbox/option roles + `aria-activedescendant` in the
  palette; toast region `role="status" aria-live="polite"`; i18n
  "Close"/"Dismiss"; labels on icon buttons; skip-to-content link;
  `scroll-padding-top` for the 45px sticky header.
- **Verify:** `rg -n '<button' src | ...` spot-check; tests assert roles;
  keyboard-only walkthrough of palette.
- **Done when:** audit items A8 are closed.

### 10. Contrast-safe text colors
- **Files:** `src/index.css`, then usages of `text-primary`/`text-warning`/
  `text-success` on light surfaces
- **Do:** add `--primary-text`-style darker tokens that reach 4.5:1 on
  `--background` in both themes; switch text usages (fills stay).
- **Verify:** compute contrast for each token pair (small script or
  documented values in `docs/ui/ui-redesign-tokens.md`).
- **Done when:** body-size colored text is ≥ 4.5:1.

### 11. Sorting on server-paged tables
- **Files:** `src/components/ui/data-table.tsx`, `payments-page.tsx`,
  `question-bank-page.tsx`
- **Do:** `DataTable` gets `manualSorting` + `onSortChange`; if the backend
  supports sort params (check contract) wire them, otherwise disable sort on
  those two tables.
- **Verify:** DataTable test — manual mode does not reorder rows locally.
- **Done when:** no table claims a sort it cannot perform.

## Status (2026-09-18)

Layer A: tasks 1–11 done (15be768 … 0ce9d6b). Deviations: no separate
`DataState` component (ErrorAlert/EmptyState/skeletons already cover it);
field errors are client-side only because the API error body carries no
field name.

Layer B: done.
- phone card layout in DataTable (90f1d65)
- dashboard per-panel Suspense (364395f)
- one icon per nav meaning (e81f14e) — Figma sidebar components still need
  the same icons
- 11px text floor (41a3aba); 12px needs a visual pass on chips/calendar
- karne + marks tables on DataTable (50506d2)
- nav/token docs refreshed (1747ea7)
- unsaved-input guard on 37 form panels (b507ba2)
- convention guard test (5a6a011)
- deliberately skipped: token-name codemod (the two vocabularies are
  aliases, zero visual change), `Card` consolidation and the three error
  styles (internal only), categorical palette classes in calendar and
  role badges (one map per feature, both themes handled)

## Layer C — outline (contract check first)
Run `check-api-contract` for each item; then a separate brainstorm/spec per
feature: role "Today" home → exception-based roll call → sentence insights →
parent feed → notification hygiene → onboarding checklist.

## Out of scope
- Backend changes (backend repo is read/run only).
- Any number or field no endpoint provides (never fabricate).
- Migrating all 50 SidePanel forms in Layer A (pilot only).
- Visual redesign / new brand palette.
