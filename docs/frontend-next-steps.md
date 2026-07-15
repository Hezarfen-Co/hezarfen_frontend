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
- Closed disclosure sections do not mount their content, so hidden panels do not fetch data.
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

Audit checklist:

- Sidebar items match role capability.
- Route guards match backend permission expectations.
- Header actions and row actions hide unavailable create/edit/delete operations.
- Dashboard scope matches the current role.
- Tables show user-facing labels, not raw ids, whenever lookup data is available.
- Empty states explain real absence of data, not loading or scope mismatch.

## Priority 2: README Update

- Update stack, scripts, and local setup notes.
- Document role hierarchy and UI scope rules.
- Document dashboard behavior and table action standards.
- Link the active docs under `docs/`.
- Keep build verification as `bun run build`.

## Priority 3: Docs Cleanup

- Keep `docs/navigation-patterns.md` as the active interaction rulebook.
- Keep `docs/ui-redesign-tokens.md` as the visual system reference.
- Keep `docs/backend-ui-alignment-plan.md` as a completed archive unless backend scope changes.
- Update docs whenever a rule changes; completed implementation plans must not look like active work.

## Remaining UX Work

### Notes UX

- Replace note create/edit `FormDialog` with a `SidePanel` or a richer notebook writing layout.
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

### Course Table Polish

- Add a term filter to the courses page.
- Consider an enrolled/all filter for students if the list becomes large.
- Keep the table compact and preserve the full detail page for course resources.

### Visual Consistency

- Decide how far to extend the table/toolbar pattern to `events-page`, `notes-page`, `terms-page`, and `settings-page`.
- Preserve non-table layouts only where cards communicate the domain better than rows.

## Request Budget Targets

- `/courses`: max 2-4 initial API calls depending on role and lookup needs.
- `/courses/:id`: initial detail data only; closed sections should make zero extra requests.
- `/exams/:id`: initial exam data only plus role-required summary data; closed sections should make zero extra requests.
- `/events/:id`: consider lazy-loading attendance if the route feels heavy.
- Dashboard should avoid broad role-specific requests unless that role actually needs global scope.
- Settings-dependent controls should share the cached settings request.

## Acceptance Checklist

- `bun run build` passes.
- Role-based UI audit is complete for sidebar, routes, dashboard, and actions.
- README is current with stack, scripts, roles, UI patterns, and docs links.
- Docs reflect active rules and do not contradict current implementation.
- No native `date` or `datetime-local` inputs remain where the shared `DatePicker` should be used.
- Closed disclosure sections do not trigger network requests.
- Dashboard remains observation-only and role-scoped.
- Table action columns use centered three-dot menus.
- Detail routes do not show stale resource content after navigating between ids.
