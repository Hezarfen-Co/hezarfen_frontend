---
name: dashboard-design
description: Rules for the hezarfen_frontend dashboard/homepage — a read-only board (no mutations), Knowvio-style stat cards + real-data charts + deadlines table, and role scoping. Load before editing src/pages/dashboard-page.tsx or the homepage.
---

# Dashboard / homepage design

Reference: `src/pages/dashboard-page.tsx`. The homepage is a **read-only status board**, not a marketing landing or action hub.

- **No mutations:** no create/edit/delete buttons, no primary CTAs that open forms. Links only navigate to existing list/detail routes.
- **Charts are allowed, on real data only.** The homepage follows the Knowvio-style
  layout: a Highlights stat-card row, a Progress-overview chart, an Activity/attendance
  split, and an Upcoming-deadlines table. Charts use `ChartBar` and
  `ChartProgressRing` from `src/components/ui/` (accent =
  `hsl(var(--primary))`, semantic tints for status).
  **Every chart/stat must be backed by a live API field** — no fabricated trends,
  streak counters, sparklines, or `+%` delta badges the backend can't produce.
  Categorical series use bars, with a plain empty state when no records exist.
- **Layout order (top → bottom):**
  1. Compact header — greeting, role chip (neutral), date.
  2. **Highlights** — role-scoped stat cards (icon + label + mono value).
  3. **Progress overview** chart + **Activity split** on `lg+`.
  4. **Upcoming deadlines** `DataTable` (exams / events / homework / appointments).
  5. Optional teacher+ Question Bank / Question Pool links.
- **Grid:** stat row `1 → 2 sm → 4 lg`; charts `lg:grid-cols-3` (progress spans 2).
- **Role scoping:** stat/chart set matches nav/role matrix (student personal tools +
  marks/attendance; teacher teaching tools; manager+ management; parent children/meals).
  Show only panels whose data exists for the role.
- **Deadlines table:** active / today / soon items only, semantic status badge, rows
  navigate by pointer, Enter, or Space. Empty state is plain text, not a create CTA.
- **Semantics:** student progress = per-course averages; staff progress =
  `Course.capacity` labeled as course capacity, never enrollment/class size.
- **Role privacy:** question navigation is teacher+ only. Student/parent deadlines
  span full width. No inferred priority or manual refresh.
