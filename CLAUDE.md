# CLAUDE.md

Hezarfen Frontend — SolidJS + TypeScript + TanStack Router + shadcn-solid, built
with Vite/Bun. Read-only status-board dashboard; Turkish/English i18n.

**The rulebook is `AGENTS.md`** — one source of truth for every agent. Read it first.

@AGENTS.md

Detailed, area-specific procedures load on demand as Skills under `.claude/skills/`
(commit-workflow, api-layer, solidjs-pitfalls, ui-conventions, dashboard-design).
Claude Code surfaces them automatically when a task matches; you can also open any
`SKILL.md` directly. Deeper design docs live under `docs/`.

Keep this file thin. Put durable rules in `AGENTS.md`, detailed procedures in a
Skill — not here.
