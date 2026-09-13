# Figma UI Migration Coverage

Source: `Hezarfen App Design` (`E8K670gsUx87yMOySGWrKf`)

Last reviewed: 2026-09-13

This document is the route-level source of truth for the Figma migration. A
Figma example never replaces a working authorization rule, API contract,
loading/error state, or mutation flow. Static names and metrics in the design
must always be replaced with real application data.

## Design pages

| Figma page | Node | Coverage |
|---|---:|---|
| Components | `3:3` | Shared controls, navigation, data display, and feedback audited |
| Icons | `3:4` | 84 Phosphor Regular 16px icons audited; shared app glyphs migrated |
| Admin | `3:5` | ADM-01..29 are captures of the running app (ADM-07 and ADM-24a archived) |
| Teacher | `3:6` | TCH-01..17 are app captures (TCH-14a archived) |
| Student | `3:7` | STU-01..14 are app captures (STU-10a archived) |
| Parent | `3:8` | PAR-01..08 are app captures |
| System | `103:2` | SYS-01, 05, 07..10 are app captures (SYS-02, 03, 04, 06 archived) |
| Builder — Operatör | `205:23536` | BLD-01 login, BLD-02 schools, BLD-02a new school panel, BLD-03 school detail, BLD-03a enter-school panel |
| Mobile Kit | `40:2` | Shared 393px mobile primitives audited |
| Student Mobile | `40:3` | STU-M01..M09 are 393x852 app captures |
| Parent Mobile | `40:4` | PAR-M01..M06 are 393x852 app captures |
| Dark Mode | `113:9393` | 10 web and 7 mobile app captures in dark theme; REF sheet kept |
| 90 Arşiv | `247:12342` | Original hand-drawn designs, tagged by source page |

The Cover manifest also names a Foundations page, but no Foundations node URL
was supplied. Exact values already exposed by component and dark-mode contexts
are used; unknown values are not inferred.

## Navigation sync (2026-09-13)

The four `Web / Sidebar / *` components mirror `src/components/layout/nav-items.ts`
as an accordion, the way the app renders them: `Web / Nav Group` headers
(Collapsed/Open) over `Web / Nav Group Item` rows (Default/Active, "Yakında"
badge). Each screen overrides only its open group and active row. When the
nav tree changes in code, update the sidebar component, not individual
screens. `Web / Switch` (Off/On) backs module and review toggles.

Color variables `brand/default`, `brand/hover`, `brand/accent`, `text/link`
and `border/focus` carry the app's values (#00ADD8 brand, #046B86 light
focus ring), so Figma and the app no longer differ on the brand color.

The shell matches the app too: `Web / Sidebar / *` is full height with the
`Brand / Logo Mark` row on top and the account row at the bottom, and
`Web / Top Bar` is the 1180px content header (back, route label, command
center, messages, notifications, Çelebi'ye sor) at x=260. Screens added from
the running app are `generate_figma_design` captures whose sidebar and top bar
were swapped for these component instances; their content is raw layers.

## Full app parity (2026-09-13)

Every screen on the role, system, mobile and dark-mode pages is now a
`generate_figma_design` capture of the running app against the local backend,
so Figma shows exactly what the app renders, including real empty states.
Rules the captures follow:

- Desktop captures swap their sidebar and top bar for the `Web / Sidebar / *`
  and `Web / Top Bar` instances; mobile captures keep raw layers.
- Features the backend does not serve are captured on their
  `/coming-soon/<slug>` page ("yakında"), never drawn with invented data.
- Dialogs, panels and the notification popover are cropped to the viewport
  (1440x1024 or 393x852); tall pages keep their full height on role pages.
- Designs with no app counterpart (password reset, institution picker, setup
  wizard, empty-state sheet, invite-code board and other screens without a route)
  moved to `90 Arşiv` with a `[Page]` name prefix instead of being deleted.
- To refresh a screen, recapture it and swap the shell again; do not edit the
  captured content by hand.

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
| `/login` | SYS-01 Giriş | Captured from the running app; the earlier e-mail/SSO design lives on the `90 Arşiv` page |
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
| `/management/students` | ADM-02 Öğrenciler | Real roster + class/term filters; mastery, attendance, plan and risk columns stay "yakında" |
| `/management/teachers` | ADM-08 Öğretmenler | Real roster + homeroom class count; branch, load, AI acceptance and status stay "yakında" |
| `/management/modules` | ADM-05 Lisans ve modüller | Real enabled/total modules per package; price, seats, renewal and invoices stay "yakında" |
| `/students` | Parent development views | Keep linked-child authorization |
| `/meals`, `/meals/:id` | Admin cafeteria | Keep menu, booking, balance, and attendance behavior |
| `/payments` | Parent/student statement | Remain read-only until a payment-provider API exists |
| `/management/terms` | ADM-25 Dönemler | Captured from the running app |
| `/events`, `/events/:id` | ADM-26 Etkinlikler, ADM-26a Etkinlik Detayı | Captured from the running app |
| `/management/pomodoros` | ADM-27 Öğrenci Pomodoroları | Captured from the running app |
| `/questions`, `/questions/:id` | TCH-15 Soru Havuzu, STU-13 Soru Detayı | Captured from the running app |
| `/notes` | STU-12 Defter | Captured from the running app |
| `/guide`, `/profile/me`, `/register` | SYS-08 Rehber, SYS-09 Profilim, SYS-10 Kayıt Ol | Captured from the running app |
| `/exam-room/:id` | STU-14 Sınav Odası | Captured from the running app (attempt in progress) |
| `/exams/:id/live` | TCH-16 Canlı Sınav İzleme | Captured from the running app |
| `/whiteboards/:id` | TCH-17 Tahta Çizim Ekranı | Captured from the running app |
| `/meals/:id` | ADM-28 Yemek Menüsü Detayı | Captured from the running app (staff view) |
| `/profile/:userId` | ADM-29 Kullanıcı Profili | Captured from the running app |
| `/builder/login` | BLD-01 Operatör Girişi | Builder session only; linked from the SYS-01/login footer |
| `/builder` | BLD-02 Okullar, BLD-02a Yeni Okul | Create, suspend/activate, delete |
| `/builder/schools/:slug` | BLD-03 Okul Detayı, BLD-03a Okula Gir | Module switchboard, password reset, enter as admin |

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

### How a missing value is shown

Earlier passes dropped every element the backend could not fill, which kept the
app honest but left the screens shorter and sparser than the design, with no
way for a reader to tell an absent number from an unbuilt one. The rule now is
to show the gap rather than hide it: render the card, tile, column or section
the design allots and mark it **"yakında"** via `src/components/ui/coming-soon.tsx`
(`ComingSoonBadge`, `ComingSoonValue`, `ComingSoonPanel`). A control that would
do nothing is rendered disabled beside the badge, never enabled and inert.

A fabricated value is still never acceptable — no invented percentages, counts,
names, deltas or statuses. And the badge is not applied mechanically: a section
with nothing behind it earns a panel, a single missing metric earns a value
slot, and a decorative flourish with no information to carry — a delta arrow
with no baseline, a progress bar with no ratio — is simply left out. Where
badging a screen would read worse than the honest smaller version, it is left
alone; `/management/settings` is the standing example, since its four designed
tabs map to fields absent from `SchoolSettings` entirely.

### Remaining

Migration is closed as of 2026-09-12 (`bd0720f`): every Figma frame has a
working screen, nothing invents a value the API cannot serve, and
`bun run build` + the full `vitest` suite are green. No open bug remains.

Both deferred checks ran green on 2026-09-12 against `test-okulu` (admin),
via throwaway Playwright tours (specs deleted after the run, nothing kept):

- Focus-contrast check: every Tab stop on the dashboard in light and dark,
  desktop and mobile, carries a visible indicator at ≥3:1 (computed per
  stop, not eyeballed). Two real fixes came out of it: translucent
  `ring-*/NN` focus utilities are now solid `ring-ring` across primitives,
  and the light-theme `--ring` is Figma's `brand-ink` (brand blue was
  2.5:1 on light surfaces).
- Mobile keyboard tour: Menü opens the sheet with focus parked on its close
  button, Escape closes it and returns focus to the Menü trigger, deadline
  rows activate with Enter, and no focus is ever lost to the body.

Desktop, student mobile and parent mobile composition are complete, and the
student and parent routes were walked at 393px, 375px and 320px against a
seeded school rather than reasoned about on paper. Two layout bugs recurred
during the work and are worth checking for in future screens: a grid that
names only a `sm:` or `lg:` column count with no base `grid-cols-1`
overflows the page, because the single implicit column takes the widest
card's min-content; and a table cell holding a name with no `truncate`
renders nowrap and overlaps the column beside it.

### Waiting for backend or product decisions

The items in “Figma features blocked by product or backend scope” stay out of
the frontend until their API contracts and authorization rules exist. They must
not be simulated with static Figma values or non-functional buttons.
