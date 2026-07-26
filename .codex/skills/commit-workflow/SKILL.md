---
name: commit-workflow
description: This repo's git commit rules — Conventional-Commit + emoji format, mandatory explicit approval before `git commit`, and the mandatory `bun run build` pre-commit check. Load before proposing or running any commit in hezarfen_frontend.
---

# Commit workflow

## Message format

Conventional Commits + a short emoji + bullet detail:

```
<type>: <emoji> <short summary>
- <concrete sub-change 1>
- <concrete sub-change 2>
```

Example:

```
feat: ✨ live exams, Turkish i18n, and mobile tab bar
- mirror the backend exam contract: schedule fields, attempts,
  questions/answers, live monitor, /time clock sync, ws proxy
- exam scheduling UI in plain words with client-side window validation
- student exam room: server-judged countdown, WebSocket autosave with
  REST fallback, two-step turn-in, review after submit or expiry
- full English/Turkish dictionaries, persisted toggle, localized dates
- bottom tab bar within thumb reach on small screens
```

## Rules

- **Title:** `type: emoji short summary` — `type` ∈ `feat|fix|refactor|chore|docs|style|test|perf`. Short, plain, no marketing tone.
- **Body:** one concrete sub-change per line, technical but plain language. Continuation lines indented two spaces.
- **Language:** every commit message is in English, always — regardless of the conversation language.
- **When to commit:** one commit per significant/complete feature. Not for tiny one-line fixes alone; never commit half-finished or non-building code.
- **Approval is mandatory, no exceptions:** before running `git commit`, show the user the exact proposed message (title + all bullets) and get **explicit approval**. `git commit` never runs before approval — every commit, including small ones.
- **Mandatory pre-commit check:** once approved, right before committing, run `bun run build` (`tsc --noEmit && vite build`) unless a build already passed since the last code change. If the user explicitly waived the build for this action, skip it. On failure, remove unused imports/vars and re-run until green. Only commit once green (or explicitly waived).
