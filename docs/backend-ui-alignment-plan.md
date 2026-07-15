# Backend UI Alignment Plan

## Context

Backend README describes a broader contract than the current frontend supports. The frontend already completed these commits:

- `3f49c18 fix: move exam weights to exam kinds`
- `a0a38de feat: align exams with school settings`

Current frontend now supports:

- `GET /settings` read path.
- Dynamic exam kind picker from settings.
- Dynamic event attendance status picker from settings.
- `open` exam mode in exam form, cards, detail, and room entry.
- Retake checkbox with `max_attempts`.
- Async duration derived from exam window.
- Open exams untimed by default.

This plan covers the remaining backend features that need simple, low-complexity UI support.

## Product Principles

- Keep every UI basic and functional first.
- Prefer existing page sections over new complex layouts.
- Avoid large reusable abstractions unless multiple pages clearly need them.
- Add one backend area per commit.
- Run `bun run build` before every commit.
- Commit messages must follow repository rules and require explicit user approval.

## Status

- Commit 1 complete in UI: live monitor shows absent count/status, attempt usage, and left timestamp; exam room summary shows attempt usage and left timestamp.
- Commit 2 complete in UI: report card types accept grade-band fields and marks show `mark / grade` when backend sends labels.
- Commit 3 complete in UI: manager settings page edits exam kinds, attendance statuses, and grade bands through `PATCH /settings`.
- Commit 4 complete in UI: manager terms page edits terms, and course create/edit can assign an optional term.
- Commit 5 complete in UI: course detail lists lesson sessions, creates sessions, and marks roll call for enrolled students.
- Commit 6 complete in UI: attendance report pages show event/session totals, rates, and course breakdowns.
- Commit 7 complete in UI: teacher work log page supports check-in, check-out, and recent entry listing.
- No planned backend-alignment commits remain.

## Remaining Commit Order

| Commit | Scope | Priority |
| --- | --- | --- |
| — | All planned items complete | — |

## Commit 1: Live Monitor And Exam Room Attempt Fields

### Goal

Expose backend attempt, no-show, and room-left fields without making the UI complex.

### Backend Fields

- `LiveRosterEntry.status`: includes `absent`.
- `LiveRosterEntry.attempt`.
- `LiveRosterEntry.attempts_used`.
- `LiveRosterEntry.max_attempts`.
- `LiveRosterEntry.left_at`.
- `LiveMonitor.counts.absent`.
- `ExamAttempt.attempt`.
- `ExamAttempt.attempts_used`.
- `ExamAttempt.max_attempts`.
- `ExamAttempt.left_at`.

### Files To Touch

- `src/api/types.ts`.
- `src/pages/live-monitor-page.tsx`.
- `src/components/exams/exam-room-ws.tsx`.
- `src/components/exams/student-exam-room.tsx`.
- `src/i18n/messages.ts`.

### UI Changes

- Add `absent` label as `No-show` / `Katılmadı`.
- Add `absent` count card in live monitor counts.
- Add a compact `Attempt` column in live monitor.
- Show `attempts_used / max_attempts` when both exist.
- Show `left_at` as `Left` / `Çıkış` in live monitor if present.
- In exam room summary, show attempt info as a small card.
- In exam room summary, show `left_at` as a small warning/info card if present.
- Do not add rejoin policy editing UI yet.

### Verification

- Run `bun run build`.
- Manually inspect type errors around nullable `remaining_ms` and optional attempt fields.

## Commit 2: Marks Grade-Band Labels

### Goal

Show grade-band labels returned by backend while keeping numeric marks primary.

### Backend Fields To Support

Backend may include:

- `grade` on mark entries.
- `average_grade` on course averages.
- `overall_grade` on report.

Exact response shape should be tolerated as optional fields.

### Files To Touch

- `src/api/types.ts`.
- `src/components/marks/marks-report-view.tsx`.
- `src/i18n/messages.ts` only if new labels are needed.

### UI Changes

- Overall average stays numeric.
- If `overall_grade` exists, show a small badge next to numeric value.
- Course average badge becomes `85 / AA` or `85` if no grade.
- Exam result mark cell becomes `90 / AA` or `90`.
- Do not add new routes.

### Verification

- Run `bun run build`.

## Commit 3: Settings Management Page

### Goal

Allow manager+ users to edit school policy from the frontend.

### Backend Endpoints

- `GET /settings`.
- `PATCH /settings`.

### Files To Add

- `src/api/patchSettings.ts`.
- `src/pages/settings-page.tsx`.

### Files To Touch

- `src/api/types.ts`.
- `src/routes/router.tsx`.
- `src/components/layout/side-nav.tsx`.
- `src/i18n/messages.ts`.

### UI Route

- Path: `/management/settings`.
- Minimum role: `manager`.

### Simple UI

- One page with three sections.
- Exam kinds as rows: `name` + `weight`.
- Attendance statuses as simple text inputs or rows.
- Grade bands as rows: `min` + `label`.
- Buttons:
  - Add row.
  - Remove row.
  - Save.
- Keep validation mostly backend-driven.
- Show backend errors with `formatApiError`.

### API Payload

- `PATCH /settings` should send only the changed lists if practical.
- If simpler, send all three lists from the current form.
- Preserve all-or-nothing validation errors from backend.

### Verification

- Run `bun run build`.

## Commit 4: Terms API And Course Term Select

### Goal

Expose academic terms and allow courses to link to a term.

### Backend Endpoints

- `GET /terms`.
- `POST /terms`.
- `PATCH /terms/{id}`.
- `DELETE /terms/{id}`.
- `GET /terms/{id}` optional if needed.

### Files To Add

- `src/api/getTerms.ts`.
- `src/api/postTerm.ts`.
- `src/api/patchTermById.ts`.
- `src/api/deleteTermById.ts`.
- `src/pages/terms-page.tsx`.

### Files To Touch

- `src/api/types.ts`.
- `src/api/postCourse.ts`.
- `src/api/patchCourseById.ts`.
- `src/pages/courses-page.tsx`.
- `src/pages/course-detail-page.tsx`.
- `src/routes/router.tsx`.
- `src/components/layout/side-nav.tsx`.
- `src/i18n/messages.ts`.

### Type Additions

- `Term`.
- `Course.term_id?: string | null`.
- `PostCourseBody.term_id?: string | null`.
- `PatchCourseBody.term_id?: string | null`.

### UI Route

- Path: `/management/terms`.
- Minimum role: `manager`.

### Simple UI

- Terms page:
  - List terms.
  - Create term with name, `starts_at`, `ends_at`.
  - Edit/delete basic controls.
- Course create/edit:
  - Optional term select.
  - `Unassigned` option.

### Verification

- Run `bun run build`.

## Commit 5: Course Sessions And Roll Call

### Goal

Add basic lesson session creation and teacher-taken roll call inside course detail.

### Backend Endpoints

- `POST /courses/{id}/sessions`.
- `GET /courses/{id}/sessions`.
- `GET /sessions/{id}`.
- `PATCH /sessions/{id}`.
- `DELETE /sessions/{id}`.
- `POST /sessions/{id}/attendance`.
- `GET /sessions/{id}/attendance`.
- `DELETE /sessions/{id}/attendance/{user}`.

### Files To Add

- `src/api/getCourseSessions.ts`.
- `src/api/postCourseSession.ts`.
- `src/api/patchSessionById.ts`.
- `src/api/deleteSessionById.ts`.
- `src/api/getSessionAttendance.ts`.
- `src/api/postSessionAttendance.ts`.
- `src/api/deleteSessionAttendanceByUserId.ts`.
- Components under `src/components/sessions/`.

### Files To Touch

- `src/api/types.ts`.
- `src/pages/course-detail-page.tsx`.
- `src/i18n/messages.ts`.

### Type Additions

- `CourseSession`.
- `SessionAttendance`.

### Simple UI

- Add `Lesson sessions` section to course detail.
- Teacher/manager can create a session.
- Each session row shows topic, teacher, starts, ends.
- `Roll call` button expands a simple roster table.
- Roster table uses enrolled students.
- Status picker uses existing dynamic `AttendanceStatusPicker`.
- Do not create a separate calendar view.

### Verification

- Run `bun run build`.

## Commit 6: Attendance Report Page

### Goal

Let users view their attendance report, and teachers view another user's report.

### Backend Endpoints

- `GET /attendance/me`.
- `GET /attendance/{user}`.

### Files To Add

- `src/api/getMyAttendance.ts`.
- `src/api/getUserAttendance.ts`.
- `src/pages/attendance-page.tsx`.
- Optional `src/pages/student-attendance-page.tsx` for teacher lookup.

### Files To Touch

- `src/api/types.ts`.
- `src/routes/router.tsx`.
- `src/components/layout/side-nav.tsx`.
- `src/i18n/messages.ts`.

### UI Routes

- `/attendance`.
- Optional teacher route: `/management/student-attendance`.

### Simple UI

- Summary cards:
  - Events total/rate.
  - Sessions total/rate.
- Course breakdown table.
- Show `present`, `absent`, `late`, `excused`, `total`, `rate`.
- Keep custom status display simple if backend exposes custom tallies.

### Verification

- Run `bun run build`.

## Commit 7: Work Log Page

### Goal

Support staff check-in/check-out and own work log.

### Backend Endpoints

- `POST /work/check-in`.
- `POST /work/check-out`.
- `GET /work/me`.
- Manager endpoints can be deferred unless user requests them:
  - `GET /work/{user}`.
  - `PATCH /work/entries/{id}`.
  - `DELETE /work/entries/{id}`.

### Files To Add

- `src/api/postWorkCheckIn.ts`.
- `src/api/postWorkCheckOut.ts`.
- `src/api/getMyWorkLog.ts`.
- `src/pages/work-log-page.tsx`.

### Files To Touch

- `src/api/types.ts`.
- `src/routes/router.tsx`.
- `src/components/layout/side-nav.tsx`.
- `src/i18n/messages.ts`.

### UI Route

- Path: `/work`.
- Minimum role: `teacher`.

### Simple UI

- One big button:
  - `Check in` if no open entry.
  - `Check out` if open entry exists.
- List newest work entries.
- Show check-in, check-out, duration.
- Do not implement manager corrections in first version.

### Verification

- Run `bun run build`.

## Known UI Simplification Tasks

### Exam Form

- Keep the current layout:
  - Row 1: kind + mode.
  - Row 2: retake checkbox + max attempts input when enabled.
  - Row 3: schedule fields only for sync/async.
- Do not show rejoin controls unless user explicitly asks.
- Keep `allow_rejoin` default behavior hidden.

### Course Detail

As features grow, course detail risks becoming crowded. Use simple sections:

- Course exams.
- Roster.
- Lesson sessions.

Avoid adding tabs unless sections become unusable.

### Settings Page

Avoid over-designing. Use plain rows and a save button first.

### Live Monitor

Avoid too many columns. Recommended columns:

- Student.
- Status.
- Attempt.
- Progress.
- Remaining.
- Left.
- Mark.

## Commit Workflow

For each commit:

- Make only one feature-area change.
- Run `bun run build`.
- Show exact commit message to user.
- Wait for explicit approval.
- Commit only after approval.

## Suggested Commit Messages

### Commit 1

```text
feat: ✨ show exam attempt state in live views
- show no-show counts and absent roster status in the live monitor
- add attempt count and left-room timestamps to monitor rows
- show current attempt and retake usage in the exam room summary
- keep untimed open exams readable with null remaining time
```

### Commit 2

```text
feat: ✨ show grade band labels on marks
- add optional grade labels to mark report types
- show overall, course, and exam grade badges when returned by the API
- keep numeric marks as the primary display
```

### Commit 3

```text
feat: ✨ manage school settings
- add settings patch API
- add manager settings page for exam kinds, attendance statuses, and grade bands
- wire settings navigation for manager roles
```

### Commit 4

```text
feat: ✨ add terms management
- add terms API functions and manager terms page
- support optional course term links in course create and edit payloads
- show selected term on course views
```

### Commit 5

```text
feat: ✨ add course sessions and roll call
- add course session API functions and course detail session list
- allow course managers to create lesson sessions
- add basic roll-call marking for enrolled students
```

### Commit 6

```text
feat: ✨ add attendance reports
- add attendance report API functions
- add user attendance summary page
- show event and lesson attendance rates with course breakdowns
```

### Commit 7

```text
feat: ✨ add staff work log
- add work check-in and check-out API functions
- add teacher work log page with open-stint action
- list recent work entries with durations
```
