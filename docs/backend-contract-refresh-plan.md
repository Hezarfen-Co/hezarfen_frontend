# Backend Contract Refresh Plan

## Context

This is the active frontend plan for the latest backend contract changes. It is
based on the last three backend commits:

- `493fbbb feat(courses): add kind course|study (etut)`
- `31e155a feat(events)!: registration audience replaces hand-picked users`
- `bd9e7d8 feat(events)!: audience targeting + teacher-only attendance`

It also tracks the separate note-file upload issue, because the frontend now has
note attachment UI and the backend exposes `/notes/{id}/files` routes.

## Goals

- Align the frontend with backend event audience, registration, and roster rules.
- Add course kind support for `course` and `study`.
- Fix and verify note file upload/list/download/delete behavior.
- Keep every change minimal, role-aware, and consistent with existing SidePanel,
  TableRowActions, pagination, and dashboard rules.

## Phase 0: Verify Running Backend

Before coding feature UI, confirm the running backend is the expected build.

- Start backend and frontend locally.
- Probe the note-file route through the Vite proxy:
  - `POST /api/notes/test/files` without auth should return `401` if the route exists.
  - `404` means the running backend is old, not the expected server, or not mounted.
- Check `/api-docs/openapi.json` includes:
  - `/notes/{id}/files`
  - `/events/{id}/roster`
  - `/events/{id}/register`
  - event `audience`
  - course `kind`

## Phase 1: Note File Upload UX

Backend contract:

- `POST /notes/{id}/files` multipart field name: `file`.
- `GET /notes/{id}/files?limit&offset` returns a page of metadata.
- `GET /notes/{id}/files/{file_id}` downloads bytes.
- `DELETE /notes/{id}/files/{file_id}` deletes one file.
- Max 10 files per note, max size from `settings.max_file_bytes`.

Files:

- `src/api/client.ts`
- `src/api/getNoteFiles.ts`
- `src/api/postNoteFile.ts`
- `src/api/getNoteFileBlob.ts`
- `src/api/getNoteFileUrl.ts`
- `src/api/deleteNoteFileById.ts`
- `src/components/notes/note-files-panel.tsx`
- `src/components/notes/note-form.tsx`
- `src/pages/notes-page.tsx`
- `src/i18n/messages.ts`

Tasks:

- Keep native `FormData`; do not set multipart `Content-Type` manually.
- Do not hide note-file `404` as an empty list once backend route is verified.
- Improve blob/download error parsing so preview/download failures show backend
  JSON errors when available.
- If note creation succeeds but a staged file upload fails, show a clear partial
  success error and keep the created note visible after refetch.
- Keep reader panel attachments below note content.
- Keep create-form staged uploads as upload-after-create only; no draft upload queue.

Verification:

- Open `/notes`.
- Create a note with one file.
- Open an existing note and upload a file.
- List, preview/download, and delete the file.
- Test oversized file and 10-file cap messages.

## Phase 2: Event Audience Types

Backend contract:

- Event response includes `audience`.
- Create/edit event can send audience:
  - `{ "kind": "school" }`
  - `{ "kind": "role", "role": "student" }`
  - `{ "kind": "course", "course": "<id>" }`
  - `{ "kind": "registration", "capacity": number | null }`
- Audience is the expected-attendee roster, not event visibility. Everyone still
  sees every event.

Files:

- `src/api/types.ts`
- `src/api/postEvent.ts`
- `src/api/patchEventById.ts`
- `src/components/events/event-form.tsx`
- `src/pages/events-page.tsx`
- `src/pages/event-detail-page.tsx`
- `src/i18n/messages.ts`

Tasks:

- Add `EventAudience` type and `audience` field on `Event`.
- Add audience picker to event create/edit SidePanel.
- For course audience, reuse existing course list data or fetch visible courses.
- Show compact audience summary on event cards/detail.
- Preserve existing start/end schedule validation.

Verification:

- Create and edit school, role, course, and registration audience events.
- Ensure omitted audience defaults to school-wide only when creating.
- Ensure editing with omitted audience keeps the current audience.

## Phase 3: Teacher-Only Event Attendance And Roster

Backend contract:

- Students never mark event attendance.
- `POST /events/{id}/attendance` is teacher+ only.
- Target `user_id` must be in the event audience.
- `GET /events/{id}/roster` returns expected attendees with `status: null` when
  unmarked.
- `GET /events/{id}/attendance` remains recorded rows, including rows no longer
  in the live audience.

Files:

- Add `src/api/getEventRoster.ts`
- `src/api/postEventAttendance.ts`
- `src/api/deleteEventAttendanceByUserId.ts`
- `src/api/types.ts`
- `src/components/events/attendance-table.tsx`
- `src/pages/event-detail-page.tsx`
- `src/i18n/messages.ts`

Tasks:

- Add `RosterEntry` type.
- Add a roster section for teacher+ users.
- Show expected attendees and clearly mark unmarked rows.
- Move teacher marking workflow to roster rows where possible.
- Keep recorded attendance rows as a secondary audit section.
- Remove or hide student self-attendance UI.

Verification:

- Student event detail has no attendance mutation controls.
- Teacher can mark an expected attendee.
- Teacher sees validation error when trying to mark a user outside audience.
- Removing attendance updates roster and audit rows.

## Phase 4: Registration Events

Backend contract:

- Registration audience uses `POST /events/{id}/register` and
  `DELETE /events/{id}/register/{user}`.
- Teachers register students; staff can register only themselves.
- Capacity may cap seats.
- Registration closes when the event starts.

Files:

- Add `src/api/postEventRegistration.ts`
- Add `src/api/deleteEventRegistrationByUserId.ts`
- `src/api/types.ts`
- `src/pages/event-detail-page.tsx`
- `src/components/users/user-search-select.tsx` if role-filter wiring is needed
- `src/i18n/messages.ts`

Tasks:

- Show registration controls only for `audience.kind === "registration"` and
  teacher+ users.
- Show capacity and current roster count.
- Add student picker filtered to `role=student` for teacher registration.
- Add self-register/self-unregister control for staff users.
- Disable or explain controls after the event starts.
- Surface `409` full/closed errors clearly.

Verification:

- Register a student.
- Register/unregister current staff user.
- Hit capacity and see a clear full-list message.
- After start time, registration actions show backend conflict cleanly.

## Phase 5: Course Kind (`course` / `study`)

Backend contract:

- Course response includes `kind`.
- Create/edit course accepts `kind`.
- `course` and `study` behave identically; the frontend only labels them.

Files:

- `src/api/types.ts`
- `src/api/postCourse.ts`
- `src/api/patchCourseById.ts`
- `src/pages/courses-page.tsx`
- `src/pages/course-detail-page.tsx`
- `src/i18n/messages.ts`

Tasks:

- Add `CourseKind = "course" | "study" | string`.
- Add `kind` to `Course`, `PostCourseBody`, and `PatchCourseBody`.
- Add simple create/edit select for course kind.
- Show muted badge in courses table and course detail header.
- Include course kind in search text.
- Do not add separate routes or pages for study courses.

Verification:

- Create a normal course.
- Create a study course.
- Edit kind both ways.
- Confirm list/detail labels update.

## Phase 6: Request And Pagination Cleanup

Files:

- `src/lib/list-page.ts`
- event and note detail sections touched above

Tasks:

- Use server paging for large main lists.
- Use paged roster/attendance requests in event detail sections.
- Avoid hidden teacher-only requests until sections are opened.
- Keep client-side filtering only where the expected dataset is small or where
  current backend filtering does not exist.

Verification:

- Build passes.
- No hidden heavy requests on student event/detail views.
- Teacher-only sections fetch only when visible.

## Commit Order

1. Docs plan only.
2. Note file verification and UX fix.
3. Course kind UI.
4. Event audience create/edit/read UI.
5. Event roster + teacher-only attendance.
6. Registration event controls.

Each implementation commit must run `bun run build` before commit and needs
explicit user approval for the exact commit message.
