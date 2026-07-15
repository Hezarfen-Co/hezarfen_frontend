# Navigation Patterns

Use one of two patterns for every new interaction:

- Full page: resources with a durable detail view, such as a course, exam, event, user, exam room, or live monitor. Full pages must include breadcrumbs when nested.
- Side panel: short contained work that should return the user to the same list context, such as create, quick edit, and filters.

Dashboard pages are observation-only. They may link to resource pages, but they must not contain create, edit, delete, or other mutation actions. A richer dashboard is allowed and encouraged, but every card or CTA must remain read-only navigation.

Admin pages are action-oriented. Lists should use shared toolbar and table primitives, compact rows, sticky headers, fixed status/action columns, and pagination.

Delete or destructive confirmation stays in a confirm dialog, not a side panel.

Header create actions should use a consistent compact button shape: icon plus label, `size="sm"`, and `rounded-sm`.

Date picking should use the shared `DatePicker` plus a separate `HH:mm` input when time is needed. Avoid native `date` and `datetime-local` controls in product forms.

Animated disclosure sections must not mount their children while closed. Closed sections should not start API requests.

Detail routes must avoid showing stale resource data after navigating between ids. If a resource id does not match the current route param, show a loading state instead of old content.

Request budgets are part of the UX. Avoid fetching role-specific or hidden-section data until the current role and visible UI need it.
