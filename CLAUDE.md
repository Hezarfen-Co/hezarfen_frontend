# CLAUDE.md — Hezarfen Frontend

SolidJS + TypeScript + TanStack Router + shadcn-solid, Vite/Bun.
Read-only status-board dashboard; Turkish/English i18n.
Bilingual codebase: Turkish UI labels, English code + commits.

**AGENTS.md mirrors this for Codex/OpenCode.** Update CLAUDE.md first, then copy.

## Gotchas

- **SolidJS, not React.** Components run once. No re-render. Signals = functions.
  Load `solidjs-pitfalls` skill before writing components.
- **Podman, not Docker.** Never suggest docker. `podman build`, `podman compose`.
- **Bun only, never npm/npx/yarn/pnpm.** Install/run/exec with `bun add`,
  `bun run`, `bunx` — this repo has no `package-lock.json`/`yarn.lock`/
  `pnpm-lock.yaml`, only `bun.lock`. Translate any copy-pasted `npm ...` /
  `npx ...` snippet to the `bun`/`bunx` equivalent before running it.
- **Pre-approved commands:** `bun run build`, `tsc --noEmit`, `vite build`,
  test runs, lint — run without asking. **Commits are also pre-approved**
  (see `commit-workflow` skill) — run `git commit` directly once the message
  format and pre-commit build check pass, no per-commit ask. Only genuinely
  risky git ops (force-push, history rewrite, branch deletion, hard
  reset/clean that would discard work) need explicit approval.

## Skills

Load on demand by area — `solidjs-pitfalls` | `ui-conventions` | `api-layer` |
`commit-workflow` | `dashboard-design`. Source of truth: `.claude/skills/<name>/SKILL.md`.
`.codex/skills/` is a generated mirror — edit `.claude`, then `bun run sync-skills`
(a pre-commit hook blocks drift).

Deeper docs by area: `docs/ui/` · `docs/auth/` · `docs/frontend/` · `docs/backend/`.
