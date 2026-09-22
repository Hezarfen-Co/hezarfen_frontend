# Feature request: list-level attendance and pomodoro summaries

Status: requested by frontend · Date: 2026-09-22
Contract checked: live OpenAPI at `https://hezarfen-backend.dizey.sh/api-docs/openapi.json`
(`info.version` 0.1.0, fetched 2026-09-22).

## Problem

Two management lists can only show a roster of students, not the numbers a
manager opens them for:

| Page | What it shows today | What it should show |
| --- | --- | --- |
| `/management/student-attendance` | Student directory; a row opens that one student's report in a side panel | Per-student present / absent / late / excused counts and attendance rate, sortable, filterable by class and term |
| `/management/pomodoros` | Student directory; a row opens that one student's log | Per-student session count and focus minutes for a period, sortable, filterable by class |

The API only offers these numbers one student at a time:

- `GET /attendance/{user}` → `AttendanceReport` (`events`, `sessions`,
  `courses[]`, `devamsizlik[]`), teacher+ or linked parent.
- `GET /pomodoro/{user}` → `PomodoroLog` (paged sessions + unpaged
  `total_focus_ms`), teacher+ or linked parent.

Filling a list of N students would take N requests per page view (and per
filter change). For a school of several hundred students that is not
acceptable, so the frontend deliberately does not do it: it shows no numbers
rather than firing a request storm, and it never shows made-up figures.

## Verified: no such endpoint exists yet

Every path in the live contract was checked. Nothing returns attendance or
pomodoro figures for more than one user:

- Attendance paths: `/attendance/me`, `/attendance/{user}`,
  `/events/{id}/attendance[/{user}]`, `/events/{id}/roster`,
  `/sessions/{id}/attendance[/{user}]`, `/meals/attendance/{user}`,
  `/meals/menus/{id}/attendance`. The event/session ones are per-event or
  per-lesson rosters, not per-student totals.
- Pomodoro paths: `/pomodoro/me`, `/pomodoro/{user}`, `/pomodoro/start`,
  `/pomodoro/finish`.
- No `summary`, `stats` or `report` path covers either domain. The nearest
  ones are unrelated: `/exams/{id}/statistics`, `/homework/report/{user}`
  (per user), `/insights/*` (AI insight runs), `/marks/karne[/{user}]`.

## Proposal

Two read-only endpoints. Both page with the standard `?limit=&offset=` and
return the standard `{items, total, limit, offset}` envelope; `total` counts
students, not attendance rows.

Naming follows the existing contract: filters are named after the resource
without an `_id` suffix (`term`, `course`, as on `/marks/karne` and
`/course-notes`), and times are UTC unix milliseconds.

### 1. `GET /attendance/summary`

Per-student attendance tallies for a set of students.

Query parameters:

| Name | Type | Required | Meaning |
| --- | --- | --- | --- |
| `class` | string | no | Only students currently in this class section (`GET /classes/{id}/members`). Omit for every student the caller may see. |
| `term` | string | no | Count only rows dated inside this term (`GET /terms/{id}`). Omit for the newest term, like `/marks/karne`. |
| `q` | string | no | Name / username / student number search, as on the existing `q` filters. |
| `sort` | string | no | `name` (default), `rate`, `absent`, `late`; prefix `-` for descending. |
| `limit`, `offset` | int | no | Standard paging; same bounds as every other list (`1..500`). |

Response `200` — `Page_AttendanceSummaryEntry`:

```json
{
  "items": [
    {
      "user": { "id": "0192…", "username": "ada.y", "display_name": "Ada Yılmaz", "student_number": "1043" },
      "sessions": { "present": 118, "absent": 4, "late": 3, "excused": 2, "custom": {}, "total": 127, "rate": 0.968 },
      "events":   { "present": 6,   "absent": 1, "late": 0, "excused": 0, "custom": {}, "total": 7,   "rate": 0.857 },
      "absence": {
        "term": "0191…",
        "name": "2026-2027 1. Dönem",
        "absent_days": 3,
        "excused_days": 1,
        "unexcused_days": 3,
        "over_limit": false
      }
    }
  ],
  "total": 32,
  "limit": 50,
  "offset": 0
}
```

- `sessions` / `events` reuse the existing `StatusCounts` schema unchanged
  (same `rate` formula: `(present + late) / (present + absent + late)`,
  `null` when there is nothing to rate).
- `absence` is the requested term's `TermAbsence` row (the same object as one
  entry of `AttendanceReport.devamsizlik`; `limits` may be dropped here since
  it is school-wide), or `null` when the student has no rows in that term.
- A student with no attendance rows at all still appears, with zero counts —
  the list is a roster first.

### 2. `GET /pomodoro/summary`

Per-student pomodoro totals for a period.

Query parameters:

| Name | Type | Required | Meaning |
| --- | --- | --- | --- |
| `class` | string | no | Only students currently in this class section. Omit for every student the caller may see. |
| `from` | int (ms) | no | Count sessions that started at or after this instant. |
| `to` | int (ms) | no | Count sessions that started before this instant. |
| `q` | string | no | Name / username / student number search. |
| `sort` | string | no | `name` (default), `focus`, `sessions`, `last`; prefix `-` for descending. |
| `limit`, `offset` | int | no | Standard paging. |

Omitting both `from` and `to` means the whole log, matching what
`GET /pomodoro/{user}` sums today.

Response `200` — `Page_PomodoroSummaryEntry`:

```json
{
  "items": [
    {
      "user": { "id": "0192…", "username": "ada.y", "display_name": "Ada Yılmaz", "student_number": "1043" },
      "sessions": 14,
      "counted_sessions": 12,
      "total_focus_ms": 20400000,
      "last_started_at": 1758540000000
    }
  ],
  "total": 32,
  "limit": 50,
  "offset": 0
}
```

- `sessions`: finished sessions in the window. A running session is not
  counted, as in `PomodoroLog.total_focus_ms`.
- `counted_sessions`: of those, how many had `counted = true` (moved the
  badge / streak counters). Optional; useful for oversight, not required.
- `total_focus_ms`: sum of `duration_ms` over those sessions. Milliseconds,
  like every other duration in the contract; the UI converts to minutes.
- `last_started_at`: newest session start in the window, `null` if none.
- Students with no sessions appear with zeros.

## Role scoping

Same rules as the per-student endpoints they summarise, applied per row:

| Caller | `class` omitted | `class` given |
| --- | --- | --- |
| admin, manager | every student | that class |
| teacher | students of the classes they are homeroom teacher of (`ClassResponse.teacher`) or teach an instance in | allowed only if they are that class's homeroom teacher or teach an instance of it; otherwise `403` |
| student, parent | `403` (they already have `/attendance/me`, `/pomodoro/me` and the per-child endpoints) | `403` |

For `/attendance/summary`, a teacher's `sessions` tally should follow the
`GET /attendance/{user}` rule: only the roll-call rows of instances the
teacher runs, plus event tallies. Managers and admins see every instance.

## Errors

- `400` — invalid `limit`/`offset`/`sort`, `from > to`, unknown `term`.
- `401` — not authenticated.
- `403` — role not allowed, or a teacher asking for a class outside their scope.
- `404` — `class` or `term` does not exist.

## Frontend plan once available

- `src/api/reports/getAttendanceSummary.ts` and
  `src/api/reports/getPomodoroSummary.ts`, with tests in
  `src/api/__tests__/reports/`.
- `/management/student-attendance`: server-paged `DataTable` with rate,
  absent, late, excused and unexcused-days columns, class and term filters;
  the row action keeps opening the full per-student report.
- `/management/pomodoros`: server-paged `DataTable` with session count, focus
  minutes and last session, class filter and a period picker.
