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
  `components/layout/`, `components/ui/`.
- **API layer:** one file per request under `src/api/`, camelCase and verb-first,
  mirroring the endpoint exactly (`getNoteById.ts`, `patchEventById.ts`,
  `deleteExamResultByUserId.ts`). Each file exports exactly one function
  matching its filename. Only `client.ts` calls `fetch` directly. Pages/
  components never call `fetch` — they call `src/api/*` functions inside
  `createResource`.

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

## Performance

- Every route component is `lazy()` (code-split per page).
- Server data always goes through `createResource` → `<Suspense>` (lightweight
  fallback), `refetch()` after mutations.
- One `<Suspense>` boundary per page, no spinner-cascades, fixed-height list rows.

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
- **Mandatory pre-commit check, every time:** once approved, right before
  running the commit:
  1. Run `bun run build` (`tsc --noEmit && vite build`) — the project already has
     `noUnusedLocals` / `noUnusedParameters` enabled, so any unused import or
     variable fails the build.
  2. If the build fails, remove the unused imports/variables and re-run until
     it passes.
  3. Only commit once the build is green.
- This workflow (format + approval + pre-commit check) applies always, without
  exception, to every commit in this repo.
