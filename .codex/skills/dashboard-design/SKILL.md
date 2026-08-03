---
name: dashboard-design
description: Rules for the hezarfen_frontend dashboard/homepage — a read-only board (no mutations), Knowvio-style stat cards + real-data charts + deadlines table, and role scoping. Load before editing src/pages/dashboard-page.tsx or the homepage.
---

# Dashboard / homepage design

Reference: `src/pages/dashboard-page.tsx`. The homepage is a **read-only status board**, not a marketing landing or action hub.

- **No mutations:** no create/edit/delete buttons, no primary CTAs that open forms. Links only navigate to existing list/detail routes.
- **Charts are allowed, on real data only.** Charts use `ChartBar`,
  `ChartProgressRing` and `ChartHeatmap` from `src/components/ui/` (accent =
  `hsl(var(--primary))`, semantic tints for status).
  **Every chart/stat must be backed by a live API field** — no fabricated trends,
  streak counters, sparklines, or `+%` delta badges the backend can't produce.
  Categorical series use bars, with a plain empty state when no records exist.
- **Layout order (top → bottom):**
  1. Compact header — greeting, role chip (neutral), date.
  2. **Highlights** — role-scoped stat cards (icon + label + mono value).
  3. Chart row on `lg+` (hidden for `parent`, who has no marks access).
  4. **Upcoming deadlines** `DataTable` (exams / events / homework / appointments),
     full width for every role — one standalone section, no side panel and no
     shortcut link in its header.
  5. **Activity heatmap** — full-width `ChartHeatmap`, 26 weeks.
- **Grid:** stat row `1 → 2 sm → 4 lg`; charts `lg:grid-cols-3`.
- **Role scoping:** stat/chart set matches nav/role matrix. Show only panels whose
  data exists for the role, and never call an endpoint the role would 403 on.
- **Deadlines table:** active / today / soon items only, semantic status badge, rows
  navigate by pointer, Enter, or Space. Empty state is plain text, not a create CTA.
- **Chart semantics per role:**
  - student — course averages + **success trend** (own marks ordered by their exam's
    date) + attendance split ring.
  - teacher+ — **success trend** (`getExamStatistics().average` per exam, spans 2)
    + the same averages grouped by course. Statistics are grader-only, so the
    resource must stay gated on `hasMinRole(role, "teacher")`.
  - Exam statistics have no bulk endpoint: cap the trend at the most recent handful
    of past, non-draft exams (`TREND_EXAM_CAP`), and swallow a per-exam failure
    rather than blanking the panel.
  - Never chart `Course.capacity` as if it were performance, and never derive a
    class (şube) average — no endpoint aggregates one, and per-student fetches do
    not belong on the homepage.
- **Heatmap source per role:** student = own `/pomodoro/me` focus minutes;
  parent = own appointments; teacher+ = dated exams/events/homework already read by
  the page. Never read another user's pomodoro log here.
- **Role privacy:** no teacher-only navigation shortcuts on the board. No inferred
  priority or manual refresh.
