# Navigation Patterns

Use one of two patterns for every new interaction:

- Full page: resources with a durable detail view, such as a course, exam, event, user, exam room, or live monitor. Full pages must include breadcrumbs when nested.
- Side panel: short contained work that should return the user to the same list context, such as create, quick edit, and filters.

## Dashboard (homepage)

Dashboard pages are **observation-only**. They must not contain create, edit,
delete, or other mutation actions. Links may navigate to list/detail routes;
they must not open create/edit panels from the homepage.

Structure (see `docs/ui-redesign-tokens.md` → Dashboard and
`src/pages/dashboard-page.tsx`):

1. Compact header (greeting, neutral role chip, date).
2. Role-scoped workspace portal cards (section navigation + optional counts).
3. Needs attention + Upcoming lists (side by side on large screens).

Rules:

- Monochrome/grayscale chrome; semantic color only for status badges.
- Portal cards: horizontal dense row; desktop title and count as `Title | N`.
- No redundant KPI strip under cards, no activity charts, no guide/marketing CTA blocks on the homepage.
- Card set is role-scoped and must stay aligned with nav/`docs/role-scope-matrix.md`
  (e.g. personal `/work` for teacher–manager only; admin uses staff-work + users).
- Attention items are time-sensitive exams/events only; empty states are informational text.

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
