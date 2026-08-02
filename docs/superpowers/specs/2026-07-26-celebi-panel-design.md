# Çelebi panel — layout fix + agentic UX polish

Date: 2026-07-26

## Problem

`CelebiPanel` (`src/components/layout/celebi-panel.tsx`) has layout bugs:

- Nested scroll containers: `SidePanel`'s body (`.side-panel-body`) is already
  `overflow-y-auto`; the panel content wraps everything in a second
  `min-h-[calc(100vh-9rem)] flex flex-col` box, and the message list inside it
  is *also* `flex-1 overflow-y-auto`. Two independent scroll regions fight for
  space.
- Composer (`Textarea` + send button) uses `mt-auto` inside the nested flex
  column instead of pinning to the outer (panel) scroll boundary — it drifts
  or gets clipped depending on content height.
- The `calc(100vh-9rem)` min-height is viewport-driven, not content-driven,
  so short threads leave dead space and the calc constant (`9rem`) silently
  goes stale if the panel header height ever changes.

Additionally, the panel currently only offers a plain-text bubble list with a
static `•••` pending indicator — thin for something styled as an AI assistant.

## API constraint (checked before design)

`src/api/chatbot/` exposes exactly three endpoints:

- `POST /chatbot/threads` — create thread
- `POST /chatbot/threads/:id/messages` — send message, returns
  `{ message_id, status: "pending" }`
- `GET /chatbot/threads/:id/messages/:id` — poll one message by id

There is no list-threads, get-thread-history, delete-thread, stop-generation,
or regenerate endpoint, and `ChatbotMessage` carries no reasoning/tool-step
data — just `role/status/content/truncated/error_code`.

**Decision (user-approved): scope this work to what the current API
supports.** Session/thread list+switch, persisted history across reload,
stop/regenerate, and live reasoning/tool-call traces are out of scope until
backend adds the supporting endpoints.

`CelebiPanel` is mounted once per authenticated session in `app-shell.tsx`
(inside `<Show when={auth.user()}>`, not remounted on open/close), so the
existing `threadId`/`messages` signals already survive panel close/reopen —
no extra work needed for that.

## Design

### 1. Single-scroll layout

Replace the current structure:

```
SidePanel body (overflow-y-auto)
  └─ div.min-h-[calc(100vh-9rem)].flex-col       ← remove
       └─ message list (flex-1 overflow-y-auto)  ← remove own scroll
       └─ composer (mt-auto)                     ← becomes sticky
```

with:

```
SidePanel body (overflow-y-auto)     ← the only scroll region
  └─ div.flex.flex-col.gap-4         ← no forced min-height, grows with content
       └─ message list (For, no scroll classes)
       └─ composer: sticky bottom-0, own bg + top border so it stays
         legible over scrolled-past messages
```

Empty-state card (`fallback` of the outer `<Show>`) is unaffected.

### 2. Minimal markdown rendering in assistant bubbles

New helper `src/components/layout/celebi-markdown.tsx` (or colocated
function) that hand-parses a small, safe subset — bold (`**x**`), inline
code (`` `x` ``), fenced code blocks (```` ``` ````), bullet lists (`- x`),
and links (`[text](url)`, `http(s)://…` auto-link) — into Solid JSX. No new
dependency (matches the repo's no-lodash/no-date-lib/no-heavy-dep rule).
Escaping: text nodes are rendered as Solid children (auto-escaped), only the
parser's own recognized syntax produces elements — no `innerHTML`.

User bubbles stay plain text (no need to parse markdown users type).

### 3. Message actions

- Copy button (new `IconCopy` in `src/components/ui/icons.tsx`, following
  existing icon component pattern) on assistant bubbles with
  `status === "complete"`. Uses `navigator.clipboard.writeText`, brief
  "copied" affordance via local per-message signal (no new global state).
- No regenerate/stop/edit — no backend support.

### 4. Pending-state polish

Replace the static `•••` pulse with rotating short status copy (e.g. cycles
between "Çelebi is thinking…" / "Çelebi düşünüyor…" localized strings) on a
timer local to the pending bubble, plus keep the existing `IconBotSquare`
pulse. Purely cosmetic — no fabricated tool-call/reasoning steps, since the
API doesn't provide them.

## Testing

- `src/api/__tests__/chatbot/` already covers the API layer — untouched.
- Manual verification (dev server): open panel, send message short + long
  thread, confirm single scrollbar, composer stays visible and pinned,
  copy button works, pending state animates, empty state unaffected, both
  locales render correctly.
- No new automated test required (UI-only layout/rendering change); existing
  `bun run build` / `tsc --noEmit` gate per commit-workflow.

## Out of scope

Thread list/switcher, cross-reload history, stop/regenerate, live
reasoning/tool-call trace — all blocked on backend endpoints that don't
exist yet.
