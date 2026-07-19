# Frontend Audit Summary

This document records the completed frontend backlog after backend alignment,
role/request audits, dense table work, side panels, notebook UI, schedule
validation, and list filtering cleanup.

Active backend-refresh work is tracked in
`docs/backend-contract-refresh-plan.md`.

## Completed State

- Backend alignment is complete for settings, terms, course subjects/capacity, draft exams, course sessions, attendance reports, pomodoro focus logs, work logs, exam attempts, and grade bands.
- Shared UI primitives cover dense tables, data toolbars, row action menus, side panels, confirm dialogs, date picking, and animated disclosures.
- Dashboard is a monochrome, role-aware, read-only status board: workspace portal cards (`Title | count` on desktop) + needs-attention / upcoming lists. No create CTAs, no vanity charts, no duplicate KPI strip. Admin sees global course/exam scope; other roles use own/enrolled/related scope where the backend supports it.
- Table and card actions use narrow centered three-dot menus through `TableRowActions`.
- Dense tables have subtle column separators, fixed action columns, and stable date/number alignment.
- Course creator display uses a username/display label when available; raw ids are fallback only.
- Course detail session creation and roll call both use right side panels; roll call rows are paginated inside the panel.
- Attendance statuses use shared localized metadata with semantic colors and explanatory detail labels.
- Disclosure sections may keep content mounted when state preservation is more important than request deferral; heavy teacher-only data is deferred where practical.
- Settings requests are cached and refreshed after settings patches.
- Sidebar icons use local SVG wrappers to avoid large icon package module graphs.
- Notes use a paper-style notebook card layout, a paper-style read dialog, and dialog-based create/edit/delete flows.
- Note attachments are wired in the reader dialog with native `FormData`, same-origin download links, and settings-based file-size warnings. Backend remains authoritative for the 10-file cap and upload validation.
- List endpoints return `{ items, total, limit, offset }`. API helpers under `src/api/` accept optional `limit`/`offset` via `Page<T>`.
- Events keep card rendering with shared toolbar search and all/upcoming/past filters.
- Event, exam, and lesson-session schedule forms use `GET /time` for server-clock-aware past-date warnings before submit.
- Start/end date-time rows use equal-width date and time controls.
- Async exam duration is derived from start/end time instead of a separate duration input.
- Exam room locally closes in-progress attempts when the countdown reaches zero, while the backend remains authoritative for final status.
- Current design refresh is complete: icon system, shell/nav, dashboard, lists, detail pages, and forms/feedback all use shared primitives and token-derived radius/border/focus patterns.

## Role Audit Result

- Students see enrolled courses, related exams, own marks, own attendance, and personal notes.
- Students do not see teacher/manager/admin create, edit, delete, settings, or user-management controls.
- Teachers see authoring, grading, live monitor, attendance/session tools, and work log where the backend allows them.
- Managers see management pages and broader course/event/exam management scope.
- Admins see global management scope for courses, exams, users, settings, and terms.
- Course sessions are visible only inside visible courses: enrolled student, course creator, or manager+.
- Session roll call is teacher-side only: the session teacher or course manager marks enrolled students; students never self-mark lesson sessions.
- A session teacher's own presence row requires manager+ on the backend; frontend does not imply a teacher can mark themself present.
- Attendance reports are personal for students; teacher lookups are narrowed to managed courses, while manager+ can see all.
- All schedule values are UTC unix-millisecond numbers. Backend remains authoritative for not-in-the-past enforcement.

## Request And Pagination Result

- Backend list contract: `?limit=&offset=` → `{ items, total, limit, offset }` (opt-in; omit `limit` for full `items`).
- Shared helpers: `src/api/page.ts` + `src/lib/list-page.ts` (`loadListPage`).
- All paged list API files return `Page<T>` and accept optional page params.
- Main lists use real server paging (`limit`/`offset` + `total`) when no client-only filter is active:
  - courses, exams, events (hybrid: full fetch only while search/status/term filters need it)
  - notes, terms, work log, admin users (server page; admin metrics still load full list once)
- Nested/deferred lists unwrap full `.items` (sessions, enrollments, attendance, exam results/questions).
- `/exams/:id/live`: client-paginated roster over snapshot/SSE (not the list envelope).
- `/attendance` and marks reports: not paged; aggregate report shapes.

## Active Backlog

### Recently fixed (this batch)

| Item | Fix |
|---|---|
| Course term read | FE reads `Course.term` (write still `term_id`) |
| Student-only pages | `RouteGuard exactRole="student"` + nav `exactRole` + `beforeLoad` on `/marks`, `/attendance` |
| Session edit | `patchSessionById` + edit SidePanel in course sessions |
| Manager work log | `/management/staff-work` + get/patch/delete work APIs |
| Work route guard | `beforeLoad` teacher+ on `/work` |
| BE student-only gates (enroll/sit/grade/roll call) | Localized error strings for the new 400/403 messages; student-marks lookup picker filters `role=student`; exam-detail own-result gates on `isStudent()` |
| Note file attachments | Reader-dialog attachments panel with list/upload/download/delete; settings exposes `max_file_bytes` |

### Incomplete Product Features

| Feature | Status |
|---|---|
| `allow_rejoin` toggle | Done — exam form checkbox + help text |
| Exam weight badge | Done — resolved from `GET /settings` exam_kinds by kind name |
| Router `beforeLoad` | Done — live (teacher+), settings/terms (manager+), exam-room (student) |
| Exam room CTA | Done — student-only on exam detail |

## UX polish batch (completed)

- Icon system: local Lucide-geometry SVGs only; semantic nav/dashboard/search/menu icons are wired through `src/components/ui/icons.tsx`.
- Shell/nav: sidebar, mobile tab bar, drawer close, account menu, and active states share the same compact token rhythm.
- Lists: `DataToolbar`, `.data-table`, sticky headers, row hover, and row action triggers are aligned across list pages.
- Detail pages: course, exam, and event detail routes share breadcrumb, header action group, and metric-card utilities.
- Forms/feedback: inputs, selects, textareas, destructive alerts, empty states, and confirm summaries share the same form surface rhythm.
- Session delete uses ConfirmDialog; exam room guards stale id on route change.
- Mobile bottom tab bar (home/courses/exams/notes/menu); exam-room hides tab chrome.
- Shared ErrorAlert with try-again; lookup pages show person labels; profile shows localized role.
- Dashboard portal cards are role-ordered workspace links (manager/admin include management tools); guide stays in the account menu, not on the homepage.
- Dashboard layout: portal grid on top; attention + upcoming below (two columns from `lg`); grayscale cards with semantic status only.
- Terms page: SidePanel create/edit + dense table row actions; header create buttons use shared min-width/radius.
- Settings: dirty-state save gate and auto-clearing success message.
- Nested breadcrumbs on exam room and live monitor.

### UX batch (2026-07, observation UI + feedback)

- Homepage is a monochrome observation board: workspace portal cards (`Title | N` on desktop), needs-attention + upcoming lists, no create CTAs or vanity charts.
- `EmptyState` component with optional primary action; wired on notes, courses, exams, events, terms, marks, work log, staff work, and course-detail sections (exams/roster/sessions).
- `createFlash` + `Alert variant="success"` for short auto-clearing confirmations after create/save/delete (lists, detail pages, profile, admin roles, sessions, questions, note files). Settings keeps its own dirty-state saved chip.
- Shared `schedule-status` tones for exam/event active/upcoming/finished chips (list, card, detail, dashboard attention).
- Auth/preferences providers wrap `RouterProvider` in `App` so pending shells and all routes keep `useAuth` context.
- Form dialogs close via header X only (outside/ESC disabled) to avoid card click-through reopen races.
- Note reader/create panels drop marketing subtitle copy; page header keeps the notebook blurb.
