# Navigation Patterns

Use one of two patterns for every new interaction:

- Full page: resources with a durable detail view, such as a course, exam, event, user, exam room, or live monitor. Full pages must include breadcrumbs when nested.
- Side panel: short contained work that should return the user to the same list context, such as create, quick edit, and filters.

Dashboard pages are observation-only. They must not contain create, edit, delete, or other mutation actions. A richer dashboard is allowed, but every section must remain informational and role-scoped.

Role scope rules:

- Admin sees global management data where the backend allows it.
- Manager sees management-level data and controls, but not admin-only user administration unless explicitly allowed.
- Teacher sees teaching, grading, session, attendance, event, and work-log controls where allowed.
- Student sees own/enrolled/related data only.
- If lookup data is available, show usernames or display names instead of raw ids. Raw ids are fallback only.

Admin pages are action-oriented. Lists should use shared toolbar and table primitives, compact rows, sticky headers, fixed status/action columns, and pagination.

Pagination and request rules:

- Do not treat client-side slicing as complete pagination for large datasets.
- If the backend endpoint supports pagination, filtering, search, or sorting, the API helper and page should use those request parameters.
- If a page intentionally fetches the full list and paginates in memory, document that the expected dataset is small or temporary.
- Search/filter/sort UI should match the request model: server-side controls for server-paginated lists, client-side controls only for accepted small lists.

Table action rules:

- Row actions use `TableRowActions` with a centered three-dot trigger.
- Action columns stay narrow and fixed (`3.5rem` on main tables, about `w-14` on compact detail tables).
- Destructive row actions stay in the menu but still open a confirm dialog before mutation.
- Date and numeric columns use stable alignment and tabular/mono text where useful.
- Dense tables use subtle column separators so column boundaries stay visible.

Delete or destructive confirmation stays in a confirm dialog, not a side panel.

Header create actions should use a consistent compact button shape: icon plus label, `size="sm"`, and `rounded-sm`.

Date picking should use the shared `DatePicker` plus a separate `HH:mm` input when time is needed. Avoid native `date` and `datetime-local` controls in product forms.

Animated disclosure sections must not mount their children while closed. Closed sections should not start API requests.

Detail routes must avoid showing stale resource data after navigating between ids. If a resource id does not match the current route param, show a loading state instead of old content.

Request budgets are part of the UX. Avoid fetching role-specific or hidden-section data until the current role and visible UI need it.
