# Frontend Next Steps

This document tracks the active frontend backlog after backend alignment, dense
tables, side panels, collapsible detail sections, dashboard work, and table action
cleanup.

## Current State

- Backend alignment is complete for settings, terms, course sessions, attendance reports, work logs, exam attempts, and grade bands.
- Shared UI primitives cover dense tables, data toolbars, row action menus, side panels, confirm dialogs, date picking, and animated disclosures.
- Dashboard is role-aware and read-only. Admin sees global course/exam scope; other roles use own/enrolled/related scope where the backend supports it.
- Table actions use a narrow centered three-dot menu through `TableRowActions`.
- Dense tables have subtle column separators, fixed action columns, and stable date/number alignment.
- Course creator display uses a username/display label when available; raw ids are fallback only.
- Course detail session creation and roll call both use right side panels; roll call rows are paginated inside the panel.
- Attendance statuses use shared localized metadata with semantic colors and explanatory detail labels.
- Disclosure sections may keep content mounted when state preservation is more important than request deferral; do not assume closed sections always avoid requests.
- Settings requests are cached and refreshed after settings patches.
- Sidebar icons use local SVG wrappers to avoid large icon package module graphs.

## Priority 1: Role-Based UI Audit

Audit every route and major page for role-specific UI behavior.

- Student:
  - sees enrolled courses, related exams, own marks, own attendance, and personal notes.
  - must not see teacher/manager/admin create, edit, delete, settings, or user-management controls.
- Teacher:
  - sees course/exam/event authoring controls where allowed.
  - sees grading, live monitor, attendance/session tools, and work log where allowed.
- Manager:
  - sees management pages such as settings, terms, reports, and broader course/event/exam management.
  - should not rely on student enrollment scope unless the feature is explicitly personal.
- Admin:
  - sees global management scope: all courses, exams, users, settings, terms, and admin-only pages.
  - dashboard KPIs and timelines should use global data where available.

Backend contract checkpoints:

- Course sessions are visible only inside visible courses: enrolled student, course creator, or manager+.
- Session roll call is teacher-side only: the session teacher or course manager marks enrolled students; students never self-mark lesson sessions.
- A session teacher's own presence row requires manager+ on the backend; frontend should not imply a teacher can mark themself present.
- Attendance reports are personal for students; teacher lookups are narrowed to managed courses, while manager+ can see all.
- All schedule values are UTC unix-millisecond numbers. Event, exam, and lesson session create/PATCH values that set a schedule in the past return `400` after the backend grace window.
- Frontend past/future checks should prefer server time from `GET /time` where countdowns or schedule validity matter.

Audit checklist:

- Sidebar items match role capability.
- Route guards match backend permission expectations.
- Header actions and row actions hide unavailable create/edit/delete operations.
- Dashboard scope matches the current role.
- Tables show user-facing labels, not raw ids, whenever lookup data is available.
- Empty states explain real absence of data, not loading or scope mismatch.

Started fixes:

- Event detail attendance roster is gated to teacher+ so students do not trigger `GET /events/{id}/attendance`.
- Course detail session list fetch is gated by the sessions disclosure or session-create panel state to avoid a hidden sessions request on initial detail load.
- Exam room entry is student/enrolled workflow only; teacher+ users get live monitor actions instead of the student exam-room action.
- Student report lookup and course enrollment pickers pass `role=student` to `/users/search` so management flows do not suggest non-student accounts.
- Courses page no longer calls `GET /courses` for students when it renders the enrolled-course list from `GET /courses/me`.
- Exams page no longer calls `GET /courses` for students; course filters use enrolled courses from `GET /courses/me`.
- Exams table edit action is limited to exam creator or manager+, matching course-management rights.
- Dashboard course scope uses `GET /courses/me` for students and `GET /courses` for teacher+ visible-course scope.
- Exam detail teacher-only data (results, statistics, roster, answer sheets, live monitor action) is limited to exam creator or manager+ instead of every teacher.
- Course detail roster and session roll-call actions are limited to course-management rights, matching backend roster/roll-call access expectations.

## Priority 2: Pagination And Request Audit

Audit list pages for pagination behavior and request shape.

- Identify which pages use client-side pagination after fetching full lists.
- Identify which backend endpoints support server-side pagination, filtering, or search.
- Verify frontend requests use backend pagination where available.
- For pages that must stay client-side for now, document the reason and expected data size.
- Check that table pagination, search, filters, and sorting are consistent with the request model.
- Avoid claiming a page is paginated if it only slices already-fetched full data.

Pages to check:

- Courses list.
- Exams list.
- Admin users directory.
- Live monitor roster.
- Work log.
- Terms/settings lists if they grow beyond small configuration data.
- Detail sub-tables such as enrollments, results, attendance, sessions, and questions.

Backend shape notes:

- `/courses/{id}/sessions` returns the course's visible sessions, most recent first.
- `/sessions/{id}/attendance` can grow with roster size; panel pagination is currently client-side over the enrolled roster.
- `/attendance/{user}` is already scope-filtered by the backend for teacher vs manager roles.

Acceptance criteria:

- Every list page is classified as server-paginated, client-paginated, or intentionally unpaginated.
- Request URLs and API helpers match the chosen pagination model.
- Large or growing datasets do not fetch all records unless explicitly accepted.
- UI pagination controls do not hide excessive network payloads.

## Priority 3: Docs Cleanup

- Keep `docs/navigation-patterns.md` as the active interaction rulebook.
- Keep `docs/ui-redesign-tokens.md` as the visual system reference.
- Keep `docs/backend-ui-alignment-plan.md` as a completed archive unless backend scope changes.
- Update docs whenever a rule changes; completed implementation plans must not look like active work.

## Remaining UX Work

### Notes UX

- Note create/edit `FormDialog` has been visually aligned with the newer form system.
- Decide whether note create/edit should remain a modal, move to `SidePanel`, or become a richer notebook writing layout.
- Decide whether the notes page should stay card-based or become a more structured notebook view.
- Keep note detail work lightweight unless notes become a durable resource with its own full page.

### Exam Question Authoring

- `ExamQuestionsPanel` still uses `FormDialog` for add/edit.
- This is acceptable while the question form stays small.
- Revisit as a `SidePanel` if question authoring grows or needs more vertical space.

### Event Detail Optimization

- Event detail still fetches attendance on initial page load.
- Consider wrapping attendance in `SectionDisclosure` so the attendance list fetches only when opened.
- Keep self-attendance visible if it remains a primary action.

### Schedule Validation

- Lesson session creation currently validates date shape and end-after-start in the client; backend still enforces not-in-the-past with server time.
- Consider adding a shared server-time helper around `GET /time` before warning users that event/exam/session schedule values are in the past.
- Keep client validation advisory only; backend remains authoritative.

### Course Table Polish

- Add a term filter to the courses page.
- Consider an enrolled/all filter for students if the list becomes large.
- Keep the table compact and preserve the full detail page for course resources.

### Visual Consistency

- Settings, terms, notes, attendance, course sessions, and course detail section headers have been visually aligned with the newer radius/form/action language.
- Decide how far to extend the table/toolbar pattern to `events-page` and remaining card-based views.
- Preserve non-table layouts only where cards communicate the domain better than rows.

## Request Budget Targets

- `/courses`: max 2-4 initial API calls depending on role and lookup needs.
- `/courses/:id`: course detail may keep opened section state mounted; avoid fetching large hidden data unless the section is opened or needed for header metadata.
- `/exams/:id`: exam detail may keep disclosure content mounted to preserve local state; defer heavy section data where practical.
- `/events/:id`: consider lazy-loading attendance if the route feels heavy.
- Dashboard should avoid broad role-specific requests unless that role actually needs global scope.
- Settings-dependent controls should share the cached settings request.
- Paginated tables should prefer server-side pagination when backend support exists.

## Acceptance Checklist

- `bun run build` passes.
- Role-based UI audit is complete for sidebar, routes, dashboard, and actions.
- Pagination and request audit is complete for list pages and large detail tables.
- README is current with stack, scripts, roles, UI patterns, and docs links.
- Docs reflect active rules and do not contradict current implementation.
- No native `date` or `datetime-local` inputs remain where the shared `DatePicker` should be used.
- Disclosure sections document whether they preserve mounted state or defer hidden-section requests.
- Dashboard remains observation-only and role-scoped.
- Table action columns use centered three-dot menus.
- Detail routes do not show stale resource content after navigating between ids.
