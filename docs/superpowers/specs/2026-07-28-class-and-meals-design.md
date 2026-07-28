# Class and Meals Design — 2026-07-28

## Route map

```text
/courses  /studies  /clubs
  └─ /courses/:id
      ├─ Overview
      ├─ Work: subjects, homework, exams
      ├─ Sessions: lessons, roll call
      └─ People: teachers, gated roster

/meals
  └─ /meals/:id
      ├─ Menu and booking
      ├─ Account: profile, balance, ledger, attendance
      ├─ Service register (teacher+)
      └─ Manage (manager+; credit admin-only)
```

## Role journeys

- Student: filter enrolled Classes → open card → inspect work/people → open Meals
  → inspect warning/price/cutoff → book or confirm cancellation → read own account.
- Parent: open Meals → choose linked child → inspect child conflict/profile/balance
  → book/cancel only that child → read child ledger and attendance.
- Assigned teacher: manage Work/Sessions but cannot delete/staff class; open meal
  service roster → mark booked student or name-lookup walk-in.
- Manager: publish menu, set capacity, manage dishes and dietary profiles, audit
  bookings; cannot write money.
- Admin: manager tools plus append-only credit.

## Wireframes

```text
Classes                       [search] [term] [new]
┌ class ───────┐ ┌ class ───────┐ ┌ class ───────┐
│ title / term │ │ title / term │ │ title / term │
│ teachers     │ │ teachers     │ │ teachers     │
│ capacity     │ │ capacity     │ │ capacity     │
│ next work    │ │ next work    │ │ next work    │
└──────────────┘ └──────────────┘ └──────────────┘

Meals                         [from] [slot] [publish]
┌ date / slot ┐  →  Menu detail
│ dishes      │     total | capacity | cutoff | status
│ warnings    │     warning banner
│ total/cap   │     dishes
└─────────────┘     book/cancel or role tool tabs
```

## States

- Loading: one page `Suspense` fallback; card grid does not disappear on local
  filter changes.
- Empty: explanatory `EmptyState`, never a dashboard mutation CTA.
- Error: localized `ErrorAlert` with retry. `409/429/503` preserve entered form
  values. Stale detail id never shows the prior record.
- Pagination: zero-result trailing page resets through filter/page sources; controls
  use backend `total`.
- Cutoff: open/closed text plus time. Backend response still decides.
- Conflict: warning icon, text listing tags, amber semantic treatment.

## Accessibility

- Cards are real links and keyboard focusable.
- Tabs use shared accessible primitive.
- Form controls have visible labels; UTC appears in serving-time label.
- Dietary status never relies on color.
- Confirm dialogs restore focus and describe cancellation/refund consequences.
- Buttons retain 44px touch targets in mobile navigation/service workflows.
- Lists use headings and native time/date semantics where available.

## Non-goals

Stream, invite codes, self-enrollment, gradebook, payment gateway/card data,
nutrition calculations, auto-pay, notifications, recurring booking, and QR service.
