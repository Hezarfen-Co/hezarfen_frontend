# Figma UI Migration Coverage

Source: `Hezarfen App Design` (`E8K670gsUx87yMOySGWrKf`)

Last reviewed: 2026-09-12

This document is the route-level source of truth for the Figma migration. A
Figma example never replaces a working authorization rule, API contract,
loading/error state, or mutation flow. Static names and metrics in the design
must always be replaced with real application data.

## Design pages

| Figma page | Node | Coverage |
|---|---:|---|
| Components | `3:3` | Shared controls, navigation, data display, and feedback audited |
| Icons | `3:4` | 84 Phosphor Regular 16px icons audited; shared app glyphs migrated |
| Admin | `3:5` | 24 screens plus 2 modal variants audited |
| Teacher | `3:6` | 14 screens plus 2 modal variants audited |
| Student | `3:7` | 11 screens plus 2 modal variants audited |
| Parent | `3:8` | 8 screens audited |
| System | `103:2` | 7 screens audited |
| Mobile Kit | `40:2` | Shared 393px mobile primitives audited |
| Student Mobile | `40:3` | 9 screens audited |
| Parent Mobile | `40:4` | 6 screens audited |
| Dark Mode | `113:9393` | 10 reference screens audited |

The Cover manifest also names a Foundations page, but no Foundations node URL
was supplied. Exact values already exposed by component and dark-mode contexts
are used; unknown values are not inferred.

## Implemented foundation

- Figma semantic light/dark aliases with the landing page's `#00ADD8` brand
  override and pixel-wing logo.
- User-selected accent colors remain authoritative over the default brand.
- Desktop shell: 260px expanded sidebar, 45px top bar, 34px navigation rows,
  30px sub-navigation rows, and an 1100px content area at the 1440px reference.
- Controls: 36px base button/input, 26px small button, 20px badge, 32px tab.
- Mobile tab leaf: 56px; existing iOS/Android safe-area handling is preserved.
- Shared Card, PageHeader, EmptyState, Alert, Dialog, SidePanel, and Toast
  surfaces use the new geometry and semantic tokens.
- Shared table shells, headers, rows, empty states, dashboard cards, and charts
  use the Figma semantic surface and border aliases.
- 39 glyphs that overlap the current application are sourced from the pinned
  official Phosphor Regular SVG package and inherit the active theme color.
- `/login` matches the SYS-01 480px standalone authentication panel while
  retaining the current username/password backend contract.

## Existing routes represented in Figma

| Route | Figma coverage | Migration rule |
|---|---|---|
| `/` | Admin, teacher, student, parent dashboards | Restyle role branches; keep read-only, API-backed data |
| `/login` | SYS-01 | Visual migration; keep current auth contract |
| `/courses`, `/courses/:id` | Teacher/student classes and mobile lessons | Reuse current course/enrollment behavior |
| `/homework`, `/homework/:id` | Teacher/student homework | Reuse DataTable, submissions, files, and role gates |
| `/exams`, `/exams/:id` | Admin/teacher/student exams and results | Keep draft/publish, attempts, grading, and statistics gates |
| `/question-bank`, `/question-bank/:id` | Admin/teacher question bank | Keep server pagination and copy semantics |
| `/calendar` | Teacher/student schedules | Keep current calendar; timetable is a future view |
| `/marks` | Student/parent result concepts | Keep student-only report contract and parent-linked access |
| `/messages` | Teacher/parent communication | Keep folders, paging, compose, archive, and trash |
| `/appointments` | Parent mobile appointment | Keep reason, confirmation, conflict, and status flows |
| `/pomodoro` | Student work session | Keep current start/finish contract until DTO expands |
| `/whiteboards`, `/whiteboards/:id` | Teacher/student boards | Keep WebSocket canvas, lock, history, and permissions |
| `/work` | Teacher work log | Keep server-stamped check-in/out behavior |
| `/management/student-marks` | Teacher student analysis | Do not fabricate mastery/AI fields |
| `/management/student-attendance` | Teacher/admin attendance | Keep course/session roll-call permissions |
| `/management/classes`, `/management/classes/:id` | Admin classes | Keep class/member/course management behavior |
| `/management/settings` | Admin settings | Keep manager+ institution settings scope |
| `/management/payments` | Admin payments | Keep ledger and permission behavior |
| `/management/staff-work` | Admin staff work | Keep existing read/update/delete contract |
| `/admin/users`, `/admin/users/:id` | Admin users and roles | Keep admin guard and critical confirmations |
| `/students` | Parent development views | Keep linked-child authorization |
| `/meals`, `/meals/:id` | Admin cafeteria | Keep menu, booking, balance, and attendance behavior |
| `/payments` | Parent/student statement | Remain read-only until a payment-provider API exists |

## Figma features blocked by product or backend scope

These designs are recorded but must not be implemented with placeholder data or
false actions:

- AI recommendation approval queue, evidence history, and rule management.
- AI question generation and institution-level competency analytics.
- Ses Atölyesi audio generation, player, quality gate, and listening analytics.
- Student/parent teacher-approved study plans and mastery time series.
- Institution selection and multi-institution session context.
- Password reset, remember-me session policy, and SSO.
- Six-step institution setup wizard and e-Okul/CSV/XLSX import pipeline.
- License purchase/billing, KVKK audit log, optical-form processing, and
  institution-level PDF/CSV reports.
- Schedule generation and conflict resolution.
- Payment initiation/provider flow and stored payment-method controls.
- General offline mutation queue, idempotency, conflict handling, and incident IDs.
- Invite-code boards and enriched Pomodoro lesson/break/streak fields.
- Parent/student personal notification, privacy, and AI-preference endpoints.

## Application routes not represented by a Figma screen

Keep the current UI and behavior until a specific design is added:

- `/register`
- `/guide`
- `/profile/me`, `/profile/:userId`
- `/notes`
- `/questions`, `/questions/:id`
- `/events`, `/events/:id`
- `/exam-room/:id`
- `/exams/:id/live`
- `/management/pomodoros`
- `/management/terms`
- `/whiteboards/:id` live canvas details beyond the list concept
- `/meals/:id` detailed account/service/management tabs
- `/studies`, `/clubs`, and `/attendance` redirect aliases

## Asset policy

Figma defines 84 Phosphor Regular icons in 16px outer/leaf boxes, with documented
13px, 14px, 15px, 18px, 20px, 22px, 26px, and 28px exceptions. The 39 glyphs
currently shared by Figma and the application are compiled from the pinned
`@phosphor-icons/core@2.1.1` Regular SVG sources. Existing local Lucide-style
icons remain only for intentionally app-specific glyphs not present on the
Figma Icons page. Temporary Figma URLs are never committed.

## Validation checklist

- `bun run build`
- `bun run test`
- Desktop screenshots at 1440x1024 in light and dark themes
- Mobile screenshots at 393x852, 375px, and 320px widths
- iOS and Android bottom-safe-area checks
- Role/module navigation and authorization regression checks
- Keyboard/focus checks for dialogs, side panels, tables, and mobile navigation
- Asset outer-box and leaf-size comparison before declaring icon fidelity complete

## Remaining implementation plan

### In progress — existing backend support

1. Parent mobile composition at 393px, then 375px and 320px:
   dashboard, linked students, messages, payments, and appointments.
2. System polish: notification panel, branded 404, network/error states,
   keyboard/focus audit, dark-mode screenshots, and role/module regression.

Secondary desktop composition and student mobile composition are complete in
code. Student mobile was reasoned against Tailwind breakpoints rather than
eyeballed: the 393px, 375px, and 320px screenshot checks in the validation
checklist are still outstanding and need a running backend and a seeded
student session.

### Waiting for backend or product decisions

The items in “Figma features blocked by product or backend scope” stay out of
the frontend until their API contracts and authorization rules exist. They must
not be simulated with static Figma values or non-functional buttons.
