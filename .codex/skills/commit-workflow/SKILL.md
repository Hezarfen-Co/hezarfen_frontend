---
name: commit-workflow
description: This repo's git commit rules — Conventional-Commit + emoji format, commits pre-approved (no per-commit ask), mandatory approval only for risky git ops (force-push, branch/history rewrite), and the mandatory `bun run build` pre-commit check. Load before proposing or running any commit in hezarfen_frontend.
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
- **Commits are pre-approved — no per-commit ask.** Run `git commit` directly once the message follows the format above and the pre-commit build is green. Still tell the user what you committed (short summary), just don't block on a yes/no first.
- **Ask first only for genuinely risky git operations:** force-push, `push --force`, rewriting published history (`rebase`, `filter-branch`, amending a commit already shared), deleting a branch, `reset --hard`/`clean -f` that would discard uncommitted work, or anything else in the Executing Actions section of the global instructions. These still require explicit approval every time — the pre-approval above covers ordinary commits only.
- **Mandatory pre-commit check:** right before committing, run `bun run build` (`tsc --noEmit && vite build`) unless a build already passed since the last code change. On failure, remove unused imports/vars and re-run until green. Only commit once green.
