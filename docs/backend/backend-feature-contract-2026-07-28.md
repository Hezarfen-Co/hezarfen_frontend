# Backend Feature Contract — 2026-07-28

Source: current `hezarfen_backend` web/domain code plus frontend API wrappers.

## Status matrix

| Area | Status | Frontend action |
| --- | --- | --- |
| Auth/users/parent links | Supported | Reuse existing roles and linked-child lookup. |
| Courses, studies, clubs | Partial | Existing kinds/capacity/teachers work. Backend must add list filters below. |
| Subjects/homework/exams/sessions | Partial | Existing CRUD works. Backend must add `due_after`. |
| Events/appointments/questions/marks/attendance | Supported | No new mutation surface. Upcoming reads use server-time `ends_after`. |
| `/limits` | Supported | Cached unauthenticated typed client added. |
| Settings | Supported | Expanded fields and dirty-field PATCH added. |
| Meal menus/dishes/profiles/bookings/attendance/ledger | Supported | Role-aware list/detail UI added. |
| Meal service roster | Missing prerequisite | Backend endpoint specified below; frontend client/UI prepared. |
| Payment gateway/nutrition/QR/notifications | No frontend action | Explicitly out of scope. |

## Shared rules

- Authentication: same-origin session cookie.
- Roles: `student < teacher < manager < admin`; `parent` is a separate family role.
- Pagination: `?limit&offset` → `{items,total,limit,offset}`. `limit` max comes from
  `limits.request.max_page_limit`; omit for all remaining rows.
- Dates:
  - schedules: UTC Unix milliseconds;
  - menu day: exact `YYYY-MM-DD`;
  - meal slot serving time: `0..1439` minutes after UTC midnight.
- Money: positive integer minor units (kuruş). No decimal API values.
- Errors: JSON error payload. Expected `400`, `401`, `403`, `404`, `409`, `429`,
  `503`; `429/503` may carry `Retry-After`.
- HTTP caching: browser cache/ETag only. No frontend cache implementation beyond
  immutable-session `/limits` memoization and existing settings memoization.

## `/limits`

`GET /limits` is unauthenticated. Response groups:

`user`, `note`, `file`, `message`, `event`, `course`, `exam`, `homework`,
`question_pool`, `appointment`, `meal`, `chatbot`, `settings`, `request`, `rate`.

Frontend `Limits` mirrors every backend field. Authentication stays usable if this
read fails; authenticated mutation forms surface retry UI and still rely on backend
validation.

## Settings DTO

```ts
type SchoolSettings = {
  exam_kinds: { name: string; weight: number }[];
  attendance_statuses: string[];
  grade_bands: { min: number; label: string }[];
  max_file_bytes: number;
  chatbot_history_turns: number;
  max_chatbot_threads: number;
  max_chatbot_message_len: number;
  meal_slots: { name: string; serving_minute: number | null }[];
  dietary_tags: string[];
  meal_cancel_cutoff_minutes: number | null;
};
```

`PATCH /settings` accepts any subset. `meal_cancel_cutoff_minutes: null` clears
the cutoff. Frontend sends only fields changed from its loaded baseline.

Roles: read any authenticated user; patch manager+.

Important errors:

- `400`: list/bound/serving-minute validation.
- `409`: removing referenced exam kind or meal slot; repeated concurrent conflict.

## Course query prerequisite

Extend both `GET /courses` and `GET /courses/me`:

```ts
type CourseQuery = {
  limit?: number;
  offset?: number;
  kind?: "course" | "study" | "club";
  q?: string;
  term_id?: string; // "none" means unassigned
};
```

Apply visibility, then `kind`, `q`, `term_id`, then pagination. `total` is the
filtered total. Search title, description, creator/assigned-teacher labels, and
term label case-insensitively.

Errors: `400` invalid kind/term/query/pagination; normal auth errors.

## Homework query prerequisite

`GET /homework?due_after=<unix-ms>&limit&offset` keeps `due_at > due_after` and
sorts nearest due date first. Apply visibility/audience and filter before
pagination/`total`.

## Meal DTOs

```ts
type MealMenu = {
  id: string; date: string; slot: string; capacity: number | null;
  dishes: MealDish[]; created_by: PersonRef; created_at: number;
};
type MealDish = {
  id: string; name: string; description: string | null;
  price_minor: number; tags: string[]; conflicts: string[]; created_at: number;
};
type MealBooking = {
  id: string; menu_id: string; student: PersonRef; booked_by: PersonRef;
  status: "booked" | "cancelled"; cancelled_at: number | null; created_at: number;
};
type MealAttendance = {
  id: string; menu_id: string; student: PersonRef;
  status: "served" | "missed"; marked_by: PersonRef; marked_at: number;
};
type DietaryProfile = {
  student: PersonRef; tags: string[]; note: string | null;
  updated_by: PersonRef | null; updated_at: number | null;
};
type MealBalance = { student: PersonRef; balance_minor: number };
type MealLedgerEntry = {
  id: string; student: PersonRef; kind: "charge" | "credit" | "reversal";
  amount_minor: number; source: string | null; method: string | null;
  note: string | null; recorded_by: PersonRef; created_at: number;
};
```

## Meal endpoints and roles

| Endpoint | Role |
| --- | --- |
| `GET /meals/menus`, `GET /meals/menus/:id` | authenticated |
| menu/dish create, patch, delete | manager+ |
| `GET /meals/profiles/me` | authenticated |
| `GET /meals/profiles/:user` | self, linked parent, teacher+ |
| `PATCH /meals/profiles/:user` | manager+ |
| `POST /meals/menus/:id/bookings` | student self or linked parent |
| `GET /meals/bookings/me`, `DELETE /meals/bookings/:id` | student/linked parent scope |
| `GET /meals/menus/:id/bookings` | manager+ |
| meal attendance writes/list | teacher+ |
| balance/ledger reads | self, linked parent, teacher+ |
| `POST /meals/credits` | admin only |

Booking/cancellation close `meal_cancel_cutoff_minutes` before the current
slot's `serving_minute`; `null` means never close. Backend atomically enforces
menu revision, capacity, cutoff, charge, and exact reversal.

## Service-roster prerequisite

`GET /meals/menus/:id/service-roster?limit&offset`, teacher+.

```ts
type MealServiceRosterEntry = {
  student: PersonRef;
  booking: MealBooking | null;
  attendance: MealAttendance | null;
};
```

Set union:

- active booked people joined to their current attendance;
- attendance-only walk-ins;
- omit cancelled-only bookings.

Return normal page envelope. Stable sort by student display label/id. `404` when
menu is missing; `403` below teacher; pagination errors are `400`.
