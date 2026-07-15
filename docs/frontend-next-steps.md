# Frontend Next Steps

This document tracks the remaining frontend work after the backend contract alignment,
dense table redesign, side-panel rollout, collapsible detail sections, and request-load
cleanup.

## Current State

- Backend alignment work is complete for settings, terms, course sessions, attendance reports, work logs, exam attempts, and grade bands.
- Navigation rules are documented in `docs/navigation-patterns.md`.
- Shared UI primitives now cover dense tables, data toolbars, side panels, confirm dialogs, date picking, and animated disclosures.
- Course detail and exam detail use animated disclosures for large sections.
- Closed disclosure sections do not mount their content, so hidden panels do not fetch data.
- Settings requests are cached and refreshed after settings patches.
- The Tabler icon dependency was removed after it caused excessive Vite module requests; sidebar icons now use local SVG wrappers.

## Remaining Work

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

## Dashboard Redesign Plan

The homepage should become a richer, more useful dashboard while staying observation-only.
It must not contain create, edit, delete, or mutation actions.

### Goals

- Provide a high-signal overview of the school workspace.
- Make the first screen useful for students, teachers, managers, and admins.
- Keep all cards as links or read-only summaries.
- Reduce unnecessary initial API calls by fetching role-specific data only.

### Role-Aware Sections

- Student:
  - today and upcoming events
  - active/upcoming exams
  - report-card snapshot
  - enrolled courses
  - recent notebook items
- Teacher:
  - courses taught
  - exams needing questions, monitoring, or grading
  - recent attendance/session activity
  - upcoming events
- Manager:
  - term status
  - active courses/events/exams
  - settings/terms health links
- Admin:
  - user role directory summary
  - management links as read-only status cards

### Layout Direction

- Use a larger hero/status strip at the top with user context and date.
- Use a dense KPI row below it.
- Add a “Needs attention” panel for items requiring review.
- Add an “Upcoming timeline” panel for events/exams/sessions.
- Add compact linked lists for courses, exams, notes, and attendance summaries.
- Keep one page-level suspense boundary where practical and avoid spinner cascades.

### Request Budget

- Dashboard should not blindly fetch notes, events, exams, courses, and marks for every role.
- Target initial request counts:
  - Student: at most 3-4 requests.
  - Teacher: at most 3-4 requests.
  - Manager/admin: at most 2-4 requests.
- If backend later adds a `/dashboard` endpoint, prefer it over multiple list fetches.

## Request Budget Targets

- `/courses`: max 2-3 initial API calls.
- `/courses/:id`: initial detail data only; closed sections should make zero extra requests.
- `/exams/:id`: initial exam data only plus role-required summary data; closed sections should make zero extra requests.
- `/events/:id`: consider lazy-loading attendance if the route feels heavy.
- Settings-dependent controls should share the cached settings request.

## Docs Cleanup

- Keep `docs/navigation-patterns.md` as the active interaction rulebook.
- Keep `docs/ui-redesign-tokens.md` as the visual system reference.
- Keep `docs/backend-ui-alignment-plan.md` as a completed archive unless backend scope changes.
- Update docs when a rule changes; do not let completed implementation plans look like active work.

## Acceptance Checklist

- `bun run build` passes.
- No native `date` or `datetime-local` inputs remain where the shared `DatePicker` should be used.
- Closed disclosure sections do not trigger network requests.
- Dashboard remains observation-only.
- Header create buttons use a consistent icon + label style.
- Detail routes do not show stale resource content after navigating between ids.
