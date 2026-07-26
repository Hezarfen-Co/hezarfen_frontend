# CLAUDE.md — Hezarfen Frontend

SolidJS + TypeScript + TanStack Router + shadcn-solid, Vite/Bun.
Read-only status-board dashboard; Turkish/English i18n.
Bilingual codebase: Turkish UI labels, English code + commits.

**AGENTS.md mirrors this for Codex/OpenCode.** Update CLAUDE.md first, then copy.

## Gotchas

- **SolidJS, not React.** Components run once. No re-render. Signals = functions.
  Load `solidjs-pitfalls` skill before writing components.
- **Podman, not Docker.** Never suggest docker. `podman build`, `podman compose`.
- **Pre-approved commands:** `bun run build`, `tsc --noEmit`, `vite build`,
  test runs, lint. Run without asking. Only commit needs approval.

## Skills

Load on demand by area — `solidjs-pitfalls` | `ui-conventions` | `api-layer` |
`commit-workflow` | `dashboard-design`. Each under `.claude/skills/<name>/SKILL.md`;
Codex uses same under `.codex/skills/`.

Project docs under `docs/` for deeper reference.
