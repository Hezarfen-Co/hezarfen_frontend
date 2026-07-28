# Backend Alignment Implementation — 2026-07-28

## Checklist

- [x] Typed cached unauthenticated `/limits`.
- [x] Auth forms use live bounds when available and remain usable on metadata failure.
- [x] Expanded settings contract and Food/AI policy UI.
- [x] Dirty-field-only settings PATCH.
- [x] Dashboard exam/event reads use `ends_after=serverNow`.
- [x] Course list API supports kind/search/term query shape.
- [x] Responsive class cards with teacher, term, capacity, nearest work.
- [x] Local pagination/search/kind/term fallback until backend filtering lands.
- [x] Course detail reorganized into Overview/Work/Sessions/People.
- [x] Meals list and durable detail routes.
- [x] Student and linked-parent booking/account journeys.
- [x] Teacher service register and walk-in lookup.
- [x] Manager menu/dish/profile/audit tools.
- [x] Admin append-only credit form.
- [x] TRY minor-unit, UTC serving-minute, cutoff, nearest-work, dirty-patch tests.
- [x] EN/TR navigation/copy and local meal icon.
- [x] Role matrix and frontend next-step links updated.
- [ ] Backend course filters before pagination/total.
- [ ] Backend homework `due_after` ordering.
- [ ] Backend service-roster union endpoint.
- [ ] Backend OpenAPI/README/integration/pagination/authorization tests for above.

Unchecked items are backend-repository prerequisites; the frontend client already
uses their specified contract.

## Acceptance criteria

- Course/meal cards work by keyboard and on one-column mobile layout.
- `/courses`, `/studies`, `/clubs`, and existing deep links remain compatible.
- Assigned teacher may manage class work/sessions but sees no delete/staff action.
- Student can book self only; parent request always carries selected linked child.
- Teacher can record meal service but cannot publish menus or book seats.
- Manager cannot see credit action; admin credit uses integer minor units.
- Dietary warning includes icon + text.
- Cancellation requires confirmation and describes cutoff/reversal.
- Menu date remains `YYYY-MM-DD`; serving time is labeled/stored as UTC minute.
- API tests assert URL, method, body, nullable settings field, and query parameters.

## Verification

```sh
bun run test
bun run test:contract
bun run build
```

Manual: student, parent, assigned teacher, manager, admin; desktop and mobile;
full menu, passed cutoff, conflict, stale id, empty page, `409`, `429`, `503`.
