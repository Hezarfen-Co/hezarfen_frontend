# AGENTS.md — Hezarfen Frontend

Persistent rulebook for any agent (Claude Code, Codex, OpenCode, …) in this repo.
Applies to every session. Always written and read in English.

Keep this file lightweight — hard constraints and repo gotchas only. Detailed
procedures live as loadable references (see **On-demand references** below); open
the relevant one when a task touches that area instead of inlining it here.

## Approval scope

User pre-approves workspace edits and verification commands (`bun run build`,
`tsc --noEmit`, `vite build`, test runs, lint) — run them without asking. The
only mandatory approval gate is at commit time: see **commit-workflow**.

## Stack (hard constraints)

- SolidJS + TypeScript, Vite scaffold.
- Routing: **TanStack Router** (`@tanstack/solid-router`), hand-written code-based
  route tree. Add `@tanstack/router-plugin` (file-based routing) only if explicitly
  requested.
- UI: **shadcn-solid** primitives (`src/components/ui/`) styled with Tailwind. Do
  not import Kobalte primitives directly in pages/domain components — add or update
  the matching `src/components/ui/` wrapper first. Dialogs, alert dialogs, dropdowns,
  popovers, and comboboxes use the documented shadcn-solid wrapper API. If
  shadcn-solid lacks a suitable component, ask before adding a library or hand-rolling.
- Runtime deps: `solid-js`, `@tanstack/solid-router`, shadcn-solid/Kobalte peer deps,
  `clsx` + `tailwind-merge` + `class-variance-authority` (for `cn()` and variants).
  No axios (use `fetch`), no date libs (`Intl.DateTimeFormat` only), no lodash, no
  separate state-management library.
- Bundle target: under ~70KB gzipped. Justify any addition beyond that.

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

## SolidJS — do not write React patterns

Solid components run **once**; there is no re-render.

1. Never destructure props — use `props.title` or `splitProps`.
2. Signals are functions: read `count()`, write `setCount(v)`.
3. Use `createSignal`/`createMemo`/`createEffect`/`createResource` — never
   `useState`/`useEffect`/`useMemo`, no dependency arrays.
4. Conditional/list rendering: `<Show>`, `<For>`, `<Switch>/<Match>`; server data:
   `<Suspense>` + `createResource`.
5. Use `class`, not `className`. Route components are `lazy()`-loaded into the
   TanStack Router tree.
6. **Two expensive resource pitfalls** — use `resource.latest` for always-rendered/
   shell reads of a refetched resource (a bare `resource()` re-suspends on every
   refetch and blanks the whole page), and drive live save-on-click toggles with a
   local signal, not `mutate`/`refetch`. Full explanation + code: **solidjs-pitfalls**
   reference.

## Performance

- Every route component is `lazy()` (code-split per page).
- Server data goes through `createResource` → `<Suspense>` (lightweight fallback),
  `refetch()` after mutations.
- One `<Suspense>` boundary per page, no spinner-cascades, fixed-height list rows.

## Containers

- We use **Podman**, not Docker. Never suggest/generate/run `docker` /
  `docker-compose` or a `Dockerfile`-only workflow — use `podman build`, `podman run`,
  `podman compose` (or `podman-compose`), and `Containerfile`. Translate any
  copy-pasted `docker ...` snippet to the `podman ...` equivalent before running it.

## On-demand references

Detailed, area-specific procedures. These live under `.claude/skills/<name>/SKILL.md`
— Claude Code auto-loads them when relevant; other agents open the file by path when
a task touches that area. Load the one that matches, not all of them.

- **commit-workflow** — commit message format, mandatory approval, pre-commit build.
- **api-layer** — `src/api/` structure and the mandatory per-domain vitest contract.
- **solidjs-pitfalls** — `resource.latest` and the save-on-click toggle pattern.
- **ui-conventions** — SidePanel vs page, header buttons, `DataTable`, date/time,
  attendance, Note Import Assistant, `DrawCanvas`.
- **dashboard-design** — the read-only status-board homepage rules.

Project docs under `docs/` remain the deeper reference (`navigation-patterns.md`,
`ui-redesign-tokens.md`, `role-scope-matrix.md`, `frontend-next-steps.md`,
`backend-ui-alignment-plan.md`).
