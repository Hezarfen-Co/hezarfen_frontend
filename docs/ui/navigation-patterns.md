# Navigation Patterns

Use one of two patterns for every new interaction:

- Full page: resources with a durable detail view, such as a course, exam, event, user, exam room, or live monitor. Full pages must include breadcrumbs when nested.
- Side panel: short contained work that should return the user to the same list context, such as create, quick edit, and filters.

## Application shell

- Desktop uses one fixed role navigation: `15rem` expanded and `4rem`
  collapsed. Collapse preference persists.
- Everything comes from `src/components/layout/nav-items.ts`: a group tree
  per role (`ADMIN_GROUPS` for manager and admin, `TEACHER_GROUPS`,
  `STUDENT_GROUPS`, `PARENT_GROUPS`), filtered by role (`minRole`,
  `exactRole`) and by the school's enabled modules. Sidebar, mobile sheet,
  header route labels, breadcrumbs' hub labels and command search reuse it.
- Groups today:
  - manager/admin: School management, Teaching & content, Student tracking,
    School services, Institution, AI
  - teacher: My classroom, Student tracking, Teaching & content, Other, AI
  - student: Study, Teaching & content, AI, Other
  - parent: My student, Institution, AI
- Every item has its own icon for its meaning; the collapsed sidebar shows
  icons only, so two items must not share one.
- Unsupported destinations are hidden; "yakında" items are the one approved
  placeholder.
- Account stays at sidebar bottom; profile, theme, language, guide, and logout
  live in its menu. Messages and notifications live in the top header.
- Mobile bottom bar: Home plus two ids per role from `PRIMARY_IDS_BY_ROLE`,
  then Search and Menu; Menu opens the full grouped tree in a sheet.
- The header back button goes back in app history, or to the nearest
  existing parent route on a deep link (`src/lib/back-target.ts`); it never
  leaves the app.
- A route that throws renders `RouteErrorFallback` in the page slot; the
  shell and navigation stay.

## Hubs

- `/courses` is the Classes hub. `kind=course|study|club` filters one list.
- `/studies` and `/clubs` redirect to the matching `/courses?kind=...` view.
- `/marks` is the student Progress hub; Report card and Attendance share tabs.
- `/attendance` redirects to the Attendance tab for old links.
- `/students` is the parent's Children hub.
- School management pages live under `/management/*` (classes, academic
  years, terms, settings, staff work, payments, modules, rosters); there is
  no single `/school` page.
- Course workspaces stay shallow: Overview, Work, Sessions, People.
- Durable detail pages carry `Breadcrumbs` (hub → record), not an in-page
  back button.

## Dashboard (homepage)

Dashboard pages are **observation-only**. They must not contain create, edit,
delete, or other mutation actions. Links may navigate to list/detail routes;
they must not open create/edit panels from the homepage.

Structure (see `docs/ui/ui-redesign-tokens.md` → Dashboard and
`src/pages/dashboard-page.tsx`):

1. Compact header (greeting, neutral role chip, date).
2. Role-scoped highlights backed by current API totals.
3. Real-data progress + attendance/workload charts.
4. Navigable upcoming-deadlines table.
5. Optional teacher+ Question Bank / Question Pool links.

Rules:

- Monochrome/grayscale surfaces; chart accent and semantic status colors only.
- Categorical values use bars or split charts, never sparklines/trend lines.
- Student progress is per-course averages. Staff progress is `Course.capacity`,
  labeled as capacity rather than current class size.
- Deadline rows navigate by kind and support pointer, Enter, and Space activation.
- Appointments feed deadlines for every role, with a persistent appointments link.
- Question Bank links are teacher+ only; student/parent deadline tables use full width.
- No card reordering or dashboard preference state.
- Highlights and panels stay aligned with `docs/auth/role-scope-matrix.md`.
- Empty states are informational text. No manual refresh or inferred priority.

Role scope rules:

- Admin sees global management data where the backend allows it.
- Manager sees management-level data and controls, but not admin-only user administration unless explicitly allowed.
- Teacher sees teaching, grading, session, attendance, event, and work-log controls where allowed.
- Student sees own/enrolled/related data only.
- If lookup data is available, show usernames or display names instead of raw ids. Raw ids are fallback only.

Lesson session rules:

- Students can see sessions only through visible/enrolled courses.
- Lesson roll call is never student self-service; it belongs in teacher/manager workflows.
- The session teacher or course manager can mark enrolled students; the teacher's own presence row is manager-only per backend rules.

Admin pages are action-oriented. Lists should use shared toolbar and table primitives, compact rows, sticky headers, fixed status/action columns, and pagination.

Pagination and request rules:

- Do not treat client-side slicing as complete pagination for large datasets.
- If the backend endpoint supports pagination, filtering, search, or sorting, the API helper and page should use those request parameters.
- If a page intentionally fetches the full list and paginates in memory, document that the expected dataset is small or temporary.
- Search/filter/sort UI should match the request model: server-side controls for server-paginated lists, client-side controls only for accepted small lists.

Question bank rules:

- The question bank (`/question-bank`, teacher+) lives in the **classes** nav group next to Exams, and is a full page because it is a durable, browsable school-wide resource.
- Its list is server-paginated/filtered (`limit`/`offset`, owner/subject/visibility/`q`); every filter or search change resets to the first page, and a delete that empties the last page clamps the page index back so the user is never left on a page with no pagination controls.
- Creating and editing a template uses a `SidePanel` from the table header; deleting uses a confirm dialog.
- Templates are private by default; exam ↔ bank transfers are copies, never links.

Table action rules:

- Row actions use `TableRowActions` with a centered three-dot trigger.
- Action columns use fixed widths (`w-28 min-w-[7rem] text-center whitespace-nowrap`) to ensure localized headers like `İŞLEMLER` do not cut off.
- Destructive row actions stay in the menu but still open a confirm dialog before mutation.
- Date and numeric columns use stable alignment and tabular/mono text where useful.
- Dense tables use subtle column separators so column boundaries stay visible.

Delete or destructive confirmation stays in a confirm dialog, not a side panel.

Header create actions should use a consistent compact button shape: icon plus label, `size="sm"`, equal min-width, and the current app radius. Page header primary create/add buttons use `class="min-w-[7.5rem] rounded-lg"`; secondary/import buttons add `variant="outline"` but keep the same size/class.
- On the Notes page header, the **"İçe Aktar"** button sits directly to the right of **"Yeni Not"** and opens a dedicated `SidePanel` for Note Import Assistant file conversion.

Date picking should use the shared `DatePicker` plus a separate `HH:mm` input when time is needed. Avoid native `date` and `datetime-local` controls in product forms.

Schedule validation should remember that event, exam, and lesson session times are UTC unix-millisecond values and the backend rejects newly set past schedule values with `400`. Use `GET /time` for server-clock-aware checks when accuracy matters.

Animated disclosure sections may either defer mounting for request savings or keep content mounted for state preservation. Choose deliberately per section and avoid hidden heavy requests unless preserving state is required.

Detail routes must avoid showing stale resource data after navigating between ids. If a resource id does not match the current route param, show a loading state instead of old content.

Request budgets are part of the UX. Avoid fetching role-specific or hidden-section data until the current role and visible UI need it.
