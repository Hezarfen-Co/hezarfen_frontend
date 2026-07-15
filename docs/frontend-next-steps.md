# Frontend Audit Summary

This document records the completed frontend backlog after backend alignment,
role/request audits, dense table work, side panels, notebook UI, schedule
validation, and list filtering cleanup.

## Completed State

- Backend alignment is complete for settings, terms, course sessions, attendance reports, work logs, exam attempts, and grade bands.
- Shared UI primitives cover dense tables, data toolbars, row action menus, side panels, confirm dialogs, date picking, and animated disclosures.
- Dashboard is role-aware and read-only. Admin sees global course/exam scope; other roles use own/enrolled/related scope where the backend supports it.
- Table and card actions use narrow centered three-dot menus through `TableRowActions`.
- Dense tables have subtle column separators, fixed action columns, and stable date/number alignment.
- Course creator display uses a username/display label when available; raw ids are fallback only.
- Course detail session creation and roll call both use right side panels; roll call rows are paginated inside the panel.
- Attendance statuses use shared localized metadata with semantic colors and explanatory detail labels.
- Disclosure sections may keep content mounted when state preservation is more important than request deferral; heavy teacher-only data is deferred where practical.
- Settings requests are cached and refreshed after settings patches.
- Sidebar icons use local SVG wrappers to avoid large icon package module graphs.
- Notes use a paper-style notebook card layout, a paper-style read dialog, and dialog-based create/edit/delete flows.
- List endpoints return `{ items, total, limit, offset }`. API helpers under `src/api/` accept optional `limit`/`offset` via `Page<T>`.
- Events keep card rendering with shared toolbar search and all/upcoming/past filters.
- Event, exam, and lesson-session schedule forms use `GET /time` for server-clock-aware past-date warnings before submit.
- Start/end date-time rows use equal-width date and time controls.
- Async exam duration is derived from start/end time instead of a separate duration input.
- Exam room locally closes in-progress attempts when the countdown reaches zero, while the backend remains authoritative for final status.

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

## Backend-Dependent Follow-Up

- Server-side search/filter params are still absent; hybrid full-fetch remains for client filters until the API adds them.

## Active Backlog

### Recently fixed (this batch)

| Item | Fix |
|---|---|
| Course term read | FE reads `Course.term` (write still `term_id`) |
| Student-only pages | `RouteGuard exactRole="student"` + nav `exactRole` + `beforeLoad` on `/marks`, `/attendance` |
| Session edit | `patchSessionById` + edit SidePanel in course sessions |
| Manager work log | `/management/staff-work` + get/patch/delete work APIs |
| Work route guard | `beforeLoad` teacher+ on `/work` |

### Incomplete Product Features

| Feature | Status |
|---|---|
| `allow_rejoin` toggle | Done — exam form checkbox + help text |
| Exam weight badge | Done — resolved from `GET /settings` exam_kinds by kind name |
| Router `beforeLoad` | Done — live (teacher+), settings/terms (manager+), exam-room (student) |
| Exam room CTA | Done — student-only on exam detail |

### Backend-Dependent Follow-Up

- Server-side search/filter params are still absent; hybrid full-fetch remains for client filters until the API adds them.

## UX polish batch (completed)

- Session delete uses ConfirmDialog; exam room guards stale id on route change.
- Mobile bottom tab bar (home/courses/exams/notes/menu); exam-room hides tab chrome.
- Shared ErrorAlert with try-again; lookup pages show person labels; profile shows localized role.
- Manager/admin dashboard portal includes daily tools + management cards; compact guide CTA on dashboard (guide stays in account menu).
- Terms page: SidePanel create/edit + dense table row actions; header create buttons use shared min-width/radius.
- Settings: dirty-state save gate and auto-clearing success message.
- Nested breadcrumbs on exam room and live monitor.
