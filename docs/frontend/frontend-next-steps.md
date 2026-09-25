# Frontend Audit Summary

This document records the completed frontend backlog after backend alignment,
role/request audits, dense table work, side panels, notebook UI, schedule
validation, and list filtering cleanup.

Active backend/class/meals alignment is tracked in:

- `docs/backend/backend-feature-contract-2026-07-28.md`
- `docs/superpowers/specs/2026-07-28-class-and-meals-design.md`
- `docs/superpowers/plans/2026-07-28-backend-alignment.md`
- `docs/research/2026-07-28-classroom-meals-benchmark.md`

## Completed State

- Backend alignment is complete for settings, terms, course subjects/capacity, draft exams, course sessions, attendance reports, pomodoro focus logs, work logs, exam attempts, and grade bands.
- Shared UI primitives cover dense tables, data toolbars, row action menus, side panels, confirm dialogs, date picking, and animated disclosures.
- Dashboard is a role-aware, read-only status board: live highlights, truthful
  per-course bars, attendance/workload splits, and navigable deadlines. No create
  CTA, sparkline, inferred priority, or manual refresh.
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
- Note Import Assistant (`src/lib/note-importer.ts`): PDF/TXT/MD file conversion with noise stripping (page numbers, watermarks, footers), PDF line-wrap joining, Markdown section formatting (`##`), bullet points, garbled OCR detection warning banners, and dedicated `SidePanel` triggered from the Notes page header.
- Drawing Canvas (`DrawCanvas`): freehand drawing with pan/zoom, eraser, quadratic smoothing, grid ruling default, PNG scene embedding (`.hzdraw.png`), and stroke state preservation during active drawing.
- Shell navigation is role-specific. Shared metadata drives desktop, mobile,
  route labels, and command search; Education and Community are collapsible
  sidebar groups. Account settings sit in the bottom menu.
- Dashboard panels use fixed role order. Unsupported/fabricated trends and
  card-order state were removed; categorical live data stays in bar/split charts.
- Dropdown primitives (`DropdownMenu`, `Combobox`, `Popover`, `Select`) elevated with Apple HIG squircle containers (`rounded-2xl`), backdrop blur (`backdrop-blur-xl`), 44pt touch targets, and subtle tactile press feedback.
- Application table action headers standardized to `w-28 min-w-[7rem] text-center whitespace-nowrap` across all report and management tables to ensure localized headers like `"İŞLEMLER"` fit without truncation.

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
  - exams and events (hybrid: full fetch only while client-only filters need it)
  - notes, terms, work log, admin users (server page; admin metrics still load full list once)
- Courses now request server pages with `kind`, `q`, and `taught`; the current
  deployment does not honor at least `q` and `taught=false`, so the list can
  show unfiltered rows or misleading page counts until the backend is fixed.
- Homework requests `due_after`, `due_before`, and `class_course` for its tabs
  and section picker. The current deployment ignores at least `due_before`,
  so the Past tab can include future deadlines. See
  `docs/backend/live-list-filter-drift-2026-09-25.md` for observed requests.
- Nested/deferred lists unwrap full `.items` (sessions, enrollments, attendance, exam results/questions).
- `/exams/:id/live`: client-paginated roster over snapshot/SSE (not the list envelope).
- Progress Report card and Attendance tabs: not paged; aggregate report shapes.

## Active Backlog

### Recently fixed (this batch)

| Item | Fix |
|---|---|
| Course term read | FE reads `Course.term` (write still `term_id`) |
| Student Progress | Report card + Attendance tabs on `/marks`; `/attendance` compatibility redirect |
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
- Mobile bottom bar mirrors each role's primary destinations and ends with Account;
  exam-room hides tab chrome.
- Shared ErrorAlert with try-again; lookup pages show person labels; profile shows localized role.
- Dashboard layout: highlights, progress + split charts, then upcoming deadlines;
  described teaching resources appear only for teacher+, while appointments stay
  linked and included in deadlines for every role.
- Terms page: SidePanel create/edit + dense table row actions; header create buttons use shared min-width/radius.
- Settings: dirty-state save gate and auto-clearing success message.
- Settings: comma-separated branch and excuse-kind fields round-trip as lists;
  a fixed save bar appears while there are unsaved changes, with a leave guard.
- Staff work: the staff card grid has a separated pagination row and record
  range; opening a card keeps the selected person's work log in a side panel.
- Meals: week and slot controls lead into a seven-day picker. Selecting a day
  shows its menus or an explicit empty-day state; publish remains a side panel.
- Homework: the section picker tolerates asynchronous option loading without
  crashing while the list or panel mounts.
- Nested breadcrumbs on exam room and live monitor.

### UX batch (2026-07, observation UI + feedback)

- Homepage is an observation board using API-backed highlights/charts/deadlines,
  with no mutation CTA or fabricated trend.
- `EmptyState` component with optional primary action; wired on notes, courses, exams, events, terms, marks, work log, staff work, and course-detail sections (exams/roster/sessions).
- `createFlash` + `Alert variant="success"` for short auto-clearing confirmations after create/save/delete (lists, detail pages, profile, admin roles, sessions, questions, note files). Settings keeps its own dirty-state saved chip.
- Shared `schedule-status` tones for exam/event active/upcoming/finished chips (list, card, detail, dashboard attention).
- Auth/preferences providers wrap `RouterProvider` in `App` so pending shells and all routes keep `useAuth` context.
- Form dialogs close via header X only (outside/ESC disabled) to avoid card click-through reopen races.
- Note reader/create panels drop marketing subtitle copy; page header keeps the notebook blurb.
