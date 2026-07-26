---
name: dashboard-design
description: Rules for the hezarfen_frontend dashboard/homepage — a read-only status board (no mutations), monochrome palette with semantic-only status color, portal-card layout, grid, and role scoping. Load before editing src/pages/dashboard-page.tsx or the homepage.
---

# Dashboard / homepage design

Reference: `src/pages/dashboard-page.tsx`. The homepage is a **read-only status board**, not a marketing landing or action hub.

- **No mutations:** no create/edit/delete buttons, no primary CTAs that open forms. Links only navigate to existing list/detail routes.
- **Palette:** monochrome / grayscale surfaces (border, card, muted). No decorative color accents, gradients, activity charts, or multi-tone portal cards. **Semantic color only** for status (active / today / soon / danger).
- **Layout order (top → bottom):**
  1. Compact header — greeting, role chip (neutral), date.
  2. Role-scoped **workspace portal cards** (section links with optional counts).
  3. **Needs attention** + **Upcoming** side by side on `lg+`, stacked on mobile.
- **Portal cards:** horizontal dense rows — icon | title + short desc | optional count. On desktop, title and count share one line as `Title | 12` (pipe separator, mono tabular count). No separate KPI strip repeating the same numbers.
- **Grid:** `1` col mobile → `2` sm → `3` lg → `4` xl. Equal-ish min height; avoid uneven multi-line stat stacks.
- **Role scoping:** card set matches nav/role matrix (student personal tools; teacher teaching tools; manager+ management; admin gets staff-work + users, not personal `/work`). Optional min-role badge is muted/neutral, not rainbow.
- **Attention list:** active / today / soon exams and events only; rows navigate to detail. Empty state is plain text, not a create CTA.
- Do not reintroduce guide marketing blocks, vanity charts, or redundant bottom KPI tiles.
