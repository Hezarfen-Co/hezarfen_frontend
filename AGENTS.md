# AGENTS.md — Hezarfen Frontend

**Mirror of CLAUDE.md** — CLAUDE.md is the authoritative rulebook.
Update CLAUDE.md first, then copy changes here.

SolidJS + TypeScript + TanStack Router + shadcn-solid, Vite/Bun.
Read-only status-board dashboard; Turkish/English i18n.
Bilingual codebase: Turkish UI labels, English code + commits.

## Gotchas

- **SolidJS, not React.** Components run once. No re-render. Signals = functions.
  Load `solidjs-pitfalls` skill before writing components.
- **Podman, not Docker.** Never suggest docker. `podman build`, `podman compose`.
- **Pre-approved commands:** `bun run build`, `tsc --noEmit`, `vite build`,
  test runs, lint. Run without asking. Only commit needs approval.

## Skills

Load on demand by area — `solidjs-pitfalls` | `ui-conventions` | `api-layer` |
`commit-workflow` | `dashboard-design`. Each under `.codex/skills/<name>/SKILL.md`;
Claude Code uses same under `.claude/skills/`.

Project docs under `docs/` for deeper reference.
