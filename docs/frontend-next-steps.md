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
- Courses use client-side table search plus term/unassigned filters while backend pagination/filter params are pending.
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

- `/courses`: client-paginated after `GET /courses` for teacher+ and `GET /courses/me` for students. Toolbar search and term filters are client-side until backend params exist.
- `/exams`: client-paginated after `GET /exams`. Student filters use `GET /courses/me`; teacher+ filters use `GET /courses`.
- `/events`: client-paginated after `GET /events`. Toolbar search and all/upcoming/past filters are client-side.
- `/admin/users`: unpaginated `GET /users` plus client filtering/search UI. Admin-only.
- `/work`: unpaginated `GET /work/me`, newest first. Personal staff log.
- `/courses/:id` exams: unpaginated `GET /courses/{id}/exams`; course-scoped.
- `/courses/:id` sessions: unpaginated `GET /courses/{id}/sessions`, deferred until sessions section or create panel is opened.
- `/courses/:id` roster: unpaginated `GET /courses/{id}/enrollments`, course-management only.
- `/events/:id` attendance: unpaginated `GET /events/{id}/attendance`, teacher+ only and deferred until the attendance disclosure opens.
- `/exams/:id` results: unpaginated `GET /exams/{id}/results`, deferred until results/grade/answer-sheet workflow needs it.
- `/exams/:id` questions: unpaginated `GET /exams/{id}/questions`, deferred until questions section is opened.
- `/exams/:id/live`: client-paginated/sorted live roster over backend snapshot/SSE.
- `/attendance` and `/management/student-attendance`: unpaginated report payloads; backend returns aggregate report shape, not a raw row list.

## Backend-Dependent Follow-Up

- Backend pagination/search/filter params have been requested.
- Do not claim true server-side pagination until those params exist in the backend README/API contract.
- When backend params arrive, update `src/api/*` helpers first and then move toolbar/search/filter/page state into request params.

## Active Backlog

- Backend server-side pagination/search/filter params still pending (see Backend-Dependent Follow-Up).
- Deferred product features (not started): exam `allow_rejoin` UI, manager work-log corrections, session edit (`PATCH`).

## UX polish batch (completed)

- Session delete uses ConfirmDialog; exam room guards stale id on route change.
- Mobile bottom tab bar (home/courses/exams/notes/menu); exam-room hides tab chrome.
- Shared ErrorAlert with try-again; lookup pages show person labels; profile shows localized role.
- Manager/admin dashboard portal includes daily tools + management cards; compact guide CTA on dashboard (guide stays in account menu).
- Terms page: SidePanel create/edit + dense table row actions; header create buttons use shared min-width/radius.
- Settings: dirty-state save gate and auto-clearing success message.
- Nested breadcrumbs on exam room and live monitor.
