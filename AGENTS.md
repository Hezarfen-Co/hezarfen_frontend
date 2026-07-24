# AGENTS.md — Hezarfen Frontend

This file is the persistent rulebook for any agent (OpenCode, Claude Code, etc.)
working in this repository. It applies to every session, not just one-off task
instructions. Always written and read in English.

## Stack (hard constraints)

- SolidJS + TypeScript, Vite scaffold.
- Routing: **TanStack Router** (`@tanstack/solid-router`), hand-written code-based
  route tree. Only add `@tanstack/router-plugin` (file-based routing) if
  explicitly requested later.
- UI: **shadcn-solid** primitives (`src/components/ui/`) following
  https://shadcn-solid.com/docs/installation and component docs, styled with
  Tailwind CSS. Do not import Kobalte primitives directly from pages/domain
  components. If a component is needed, add or update the matching
  shadcn-solid-style wrapper under `src/components/ui/` first. Dialogs,
  alert dialogs, dropdowns, popovers, and comboboxes must use the documented
  shadcn-solid wrapper API. If shadcn-solid does not provide a suitable
  component, ask before adding another library or hand-rolling one.
- Runtime dependencies: `solid-js`, `@tanstack/solid-router`, shadcn-solid/Kobalte
  peer deps, and `clsx` + `tailwind-merge` + `class-variance-authority` (for
  `cn()` and variant helpers, <2KB total). No axios (use `fetch`), no date libs
  (`Intl.DateTimeFormat` only), no lodash, no separate state-management library.
- Bundle target: under ~70KB gzipped. Justify any addition beyond that.

## Naming & file structure

- **One component per file.** Never two sibling components in the same file.
  Exception: shadcn-solid primitive wrapper files under `src/components/ui/`
  may export the documented compound component API from one file (for example
  `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`).
- File name = component name in kebab-case; the exported component is
  PascalCase. Example: `note-card.tsx` → `NoteCard`. Colocated files (types,
  tests) keep the same base name: `note-card.tsx`, `note-card.types.ts`,
  `note-card.test.tsx`.
- Components in the same domain live in the same folder: `components/notes/`,
  `components/events/`, `components/exams/`, `components/users/`,
  `components/attendance/`, `components/courses/`, `components/marks/`,
  `components/sessions/`, `components/messages/`, `components/homework/`,
  `components/layout/`, `components/ui/`.
- Cross-cutting app state lives in `src/stores/` (`auth-context.tsx`,
  `preferences-context.tsx`) — context providers only, never domain components.
  School-policy lists (exam kinds, attendance statuses, grade bands) come from
  `getSettings()` in a `createResource`, never hardcoded in components.
- **API layer:** Domain-based folders under `src/api/` (e.g., `src/api/notes/`,
  `src/api/exams/`). One file per request under its domain folder, camelCase and verb-first,
  mirroring the endpoint exactly (`src/api/notes/getNoteById.ts`,
  `src/api/exams/deleteExamResultByUserId.ts`). Each file exports exactly one function
  matching its filename. Each domain must have an `index.ts` re-exporting its endpoints.
  Only `src/api/client/client.ts` calls `fetch` directly. Pages/
  components never call `fetch` — they call `src/api/<domain>` API functions inside
  `createResource`.
- **API tests — mandatory:** Every new or modified API endpoint file must have a
  corresponding test file under `src/api/__tests__/<domain>/<domain>.test.ts` (one
  test file per domain, not per endpoint). Tests use **vitest** (globals enabled) and
  the shared helpers from `src/api/__tests__/helpers/mock-fetch.ts` (`mockFetchSuccess`,
  `mockFetch204`, `mockFetchError`, `lastFetchCall`). Each test asserts the correct
  URL, HTTP method, and request body (when applicable). The `afterEach` hook must call
  `vi.restoreAllMocks()`. Run all tests with `bun run test` before committing. Do not
  skip or defer API tests — they are part of the definition of done for every API
  change.

## SolidJS rules — do not write React patterns

Solid components run **once**, there is no re-render:

1. Never destructure props (`function Card({title})` ❌) — use `props.title`
   or `splitProps`.
2. Signals are functions: read with `count()`, write with `setCount(v)`.
3. Use `createSignal`, `createMemo`, `createEffect`, `createResource` — never
   `useState`/`useEffect`/`useMemo`, no dependency arrays.
4. Use `<Show>`, `<For>`, `<Switch>/<Match>` for conditional/list rendering;
   `<Suspense>` + `createResource` for server data.
5. Use `class`, not `className`. Route components are `lazy()`-loaded and wired
   into the TanStack Router route tree.
6. **`resource.latest` for reads outside `<Suspense>`.** A bare `resource()`
   re-suspends on **every** `refetch()` (not just the first load, and
   `initialValue` does NOT stop it). If that read sits outside a `<Suspense>` —
   e.g. an always-rendered badge/count in a shell component mounted beside
   `<Outlet>` — the suspension bubbles up and **blanks the whole page** for the
   entire fetch duration, once per poll/refetch. Invisible on a fast local
   backend, a multi-second blank on a real one. Rule: reads under a page's
   `<Suspense>` use `resource()`; always-rendered/shell/badge reads of a
   periodically-refetched resource use `resource.latest` (last value, no
   suspend). Poll-driven revalidation belongs behind `.latest`.

## Performance

- Every route component is `lazy()` (code-split per page).
- Server data always goes through `createResource` → `<Suspense>` (lightweight
  fallback), `refetch()` after mutations.
- One `<Suspense>` boundary per page, no spinner-cascades, fixed-height list rows.

## Project docs and current UI rules

- Treat these docs as active project context before changing related areas:
  - `docs/frontend-next-steps.md` — completed audit summary plus active backend-dependent/frontend follow-up notes.
  - `docs/navigation-patterns.md` — interaction rules, role scope, side-panel/full-page decisions, dashboard structure.
  - `docs/ui-redesign-tokens.md` — visual density, radius, table, side-panel, status UI, and dashboard card conventions.
  - `docs/role-scope-matrix.md` — role access matrix for pages/nav/dashboard cards.
  - `docs/backend-ui-alignment-plan.md` — completed backend-alignment archive; do not treat it as active work unless backend scope changes.
- Durable resources use full detail pages. Short create/edit/filter work uses `SidePanel`. Destructive actions use confirm dialogs.
- Header create actions use compact icon+label buttons with consistent size and current radius. Page header primary create/add buttons use `size="sm" class="min-w-[7.5rem] rounded-lg"`; secondary/import buttons use `variant="outline"` with the same size/class. Section/sub-panel header actions use `variant="outline" size="sm" class="rounded-lg"` unless matching a page header button. Action buttons inside sub-panels must not duplicate section headers — primary create/add/assign actions must be placed in the header `actions` prop of the parent disclosure or page header.
- Application tables must use `src/components/ui/data-table.tsx` `DataTable`. Actions columns must use `w-28 min-w-[7rem] text-center whitespace-nowrap` to prevent truncation of localized headers like `"İŞLEMLER"`.
- Table-page headers are folded into the `DataTable` title/description/actions area; do not render a separate `PageHeader` above pages whose primary content is a table. Search inputs, dropdown filters, filter buttons, and table toolbar actions must always share the same height and radius (`h-9 rounded-lg` unless the shared component changes the standard globally).
- Pages/domain components must not import or render `Table` primitives directly; only the `DataTable` wrapper and table primitive files may do that.
- **Note Import Assistant**: Raw PDF/TXT/MD files are converted to structured Markdown notes using `src/lib/note-importer.ts`. Noise (page numbers, headers/footers, watermarks) is removed, PDF mid-sentence line wraps are re-joined, headings (`##`) and bullet lists are formatted, and OCR unreadable artifacts are flagged with `⚠️ Some content may be unreadable due to OCR/extraction issues`. Never invent content or fluff preamble. Note Import Assistant lives in a dedicated `SidePanel` triggered from the Notes page header to the right of the "Yeni Not" button.
- **Drawing Canvas (`DrawCanvas`)**: Freehand drawings are saved as `.hzdraw.png` files with embedded scene JSON metadata. Live drawing effects must guard `initialScene` against re-initializing during active strokes.
- Disclosure sections may either defer mounting for request savings or keep content mounted for state preservation; choose deliberately and avoid hidden heavy requests unless needed.
- Date/time product forms use shared `DatePicker` plus a separate `HH:mm` input. Backend schedule fields are UTC unix-millisecond values and the backend rejects newly set past event/exam/session schedules with `400`; use `GET /time` for server-clock-aware checks when accuracy matters.
- Lesson session roll call is teacher/manager workflow only. Students never self-mark lesson sessions; the session teacher or course manager marks enrolled students, and the session teacher's own presence row is manager-only per backend rules.
- Attendance status UI uses shared localized metadata: label, short detail text, and semantic colors.

## Dashboard / homepage design

Reference: `src/pages/dashboard-page.tsx`. Homepage is a **read-only status board**, not a marketing landing or action hub.

- **No mutations** on the dashboard: no create/edit/delete buttons, no primary CTAs that open forms. Links only navigate to existing list/detail routes.
- **Palette:** monochrome / grayscale surfaces (border, card, muted). Decorative color accents, gradients, activity charts, and multi-tone portal cards are out. **Semantic color only** for status (active / today / soon / danger).
- **Layout order (top → bottom):**
  1. Compact header — greeting, role chip (neutral), date.
  2. Role-scoped **workspace portal cards** (section links with optional counts).
  3. **Needs attention** + **Upcoming** side by side on `lg+`, stacked on mobile.
- **Portal cards:** horizontal dense rows — icon | title + short desc | optional count. On desktop, title and count share one line as `Title | 12` (pipe separator, mono tabular count). No separate KPI strip that repeats the same numbers under the cards.
- **Grid:** `1` col mobile → `2` sm → `3` lg → `4` xl. Equal-ish min height; avoid uneven multi-line stat stacks.
- **Role scoping:** card set matches nav/role matrix (student personal tools; teacher teaching tools; manager+ management; admin gets staff-work + users, not personal `/work`). Optional min-role badge on a card is muted/neutral, not rainbow.
- **Attention list:** active / today / soon exams and events only; rows navigate to detail. Empty state is plain text, not a create CTA.
- Do not reintroduce guide marketing blocks, vanity charts, or redundant bottom KPI tiles.

## Containers

- We use **Podman**, not Docker. Never suggest, generate, or run `docker` /
  `docker-compose` commands or a `Dockerfile`-only workflow — use the Podman
  equivalents instead: `podman build`, `podman run`, `podman compose` (or
  `podman-compose` if that's what's installed), and `Containerfile` (Podman's
  name for the same syntax as a Dockerfile; `Dockerfile` also works but prefer
  `Containerfile` for new files).
- If a task or a copy-pasted snippet from elsewhere uses `docker ...`, translate
  it to the matching `podman ...` command before running or proposing it.

## Git commit workflow

**Commit message format** (Conventional Commits + short emoji + bullet detail):

```
<type>: <emoji> <short summary>
- <concrete sub-change 1>
- <concrete sub-change 2>
- ...
```

Example:

```
feat: ✨ live exams, Turkish i18n, and mobile tab bar
- mirror the backend exam contract: schedule fields, attempts,
  questions/answers, live monitor, /time clock sync, ws proxy
- exam scheduling UI in plain words with client-side window validation
- teacher question authoring: choice/written, points, correct pick
- student exam room: server-judged countdown, WebSocket autosave with
  REST fallback, two-step turn-in, review after submit or expiry
- teacher live monitor over SSE with answer sheets, auto-score
  suggestion, and inline grading
- full English/Turkish dictionaries, persisted toggle, localized dates,
  document lang so Turkish casing renders İ correctly
- weight badges speak plain words ("counts ×2" / "×2 sayılır")
- bottom tab bar within thumb reach on small screens
```

Rules:

- **Title:** `type: emoji short summary` — `type` ∈
  `feat|fix|refactor|chore|docs|style|test|perf`. Keep the summary short,
  plain, no marketing tone.
- **Body:** one concrete sub-change per line, technical but plain language (the
  reader should understand what actually changed). Wrapped lines are indented
  two spaces on the continuation, as in the example above.
- **Language:** every commit message is written in English, always — regardless
  of what language the conversation with the user is in.
- **When to commit:** one commit per significant/complete feature. Not for tiny
  one-line fixes on their own, and never commit half-finished or non-building
  code.
- **Approval is mandatory, no exceptions:** before running `git commit`, the
  agent shows the user the exact proposed commit message (title + all bullets)
  and asks for **explicit approval**. `git commit` never runs before approval
  is given. This applies to every commit, including small ones — no exceptions.
- **Mandatory pre-commit check:** once approved, right before running the commit,
  run `bun run build` (`tsc --noEmit && vite build`) unless a build has already
  passed since the last code change. If the user explicitly says not to run a
  build for the current action, do not run it. If the build fails, remove the
  unused imports/variables and re-run until it passes. Only commit once the build
  is green or the user explicitly waived the build for that action.
- This workflow (format + approval + pre-commit check) applies always, without
  exception, to every commit in this repo.
