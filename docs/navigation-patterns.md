# Navigation Patterns

Use one of two patterns for every new interaction:

- Full page: resources with a durable detail view, such as a course, exam, event, user, exam room, or live monitor. Full pages must include breadcrumbs when nested.
- Side panel: short contained work that should return the user to the same list context, such as create, quick edit, and filters.

Dashboard pages are observation-only. They may link to resource pages, but they must not contain create, edit, or delete actions.

Admin pages are action-oriented. Lists should use shared toolbar and table primitives, compact rows, sticky headers, fixed status/action columns, and pagination.

Delete or destructive confirmation stays in a confirm dialog, not a side panel.
