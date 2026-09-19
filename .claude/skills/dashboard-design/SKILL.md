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
- **Module scoping:** a school can switch any module off, and every route of an
  off module answers `403 {error, module}`. Gate each resource source on
  `on(module)` (waits for the module list, then `isEnabled`), wrap fetchers in
  `quiet()` so a refusal racing a builder's switch reads as no data, and leave out
  the stat tiles / panels of an off module rather than showing zeros.
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
- **Role privacy:** no generic teacher-only navigation shortcuts on the board
  (quick links to management pages). No inferred priority or manual refresh.
- **Allowed exception — "today" rows:** `TodayLessonsPanel` rows may link each
  lesson to its own section (`/instances/$id?tab=sessions&rollCall=<session>`
  for a teacher, `?tab=sessions` for a student). The link is a record of the
  viewer's own day, not a shortcut, and the board still takes no attendance
  itself. The teacher panel reads roll-call counts only for lessons that have
  started; the student panel never reads roll call. Gate it on the `sessions`
  module.
- **Teacher homework queue:** `HomeworkQueuePanel` reads the roster
  (`/homework/{id}/submissions`) of at most `QUEUE_CAP` of the teacher's own
  homework due in the last 14 days or next 2, and says how many have not handed
  in and how many wait for a grade; rows link to the homework. No bulk endpoint,
  so the cap stays; a failed read drops its row.
- **Parent homework:** `ChildHomeworkPanel` reads the selected child's
  `/homework/report/{user}` (overdue / due this week) with no links — a parent
  cannot open the course-scoped homework page.
