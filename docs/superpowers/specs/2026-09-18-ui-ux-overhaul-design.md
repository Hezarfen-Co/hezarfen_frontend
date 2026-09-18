# UI/UX Overhaul — Design

Date: 2026-09-18 · Status: approved direction (A → B → C), plan pending

## Goal

Make Hezarfen feel like a professional product: nothing silently wrong, one way
to do each thing, and a home screen that tells each role what to do today.

Inputs: a static code audit (subagent), an independent Codex (`gpt-5.6-luna`)
audit, and web research. Counts below come from grep over `src/` excluding
tests, on 2026-09-18 at commit `896684b`.

## Layer A — Trust and foundations (do first)

Fixes where the UI is wrong, loses data, or hides failure.

| # | Problem | Evidence | Fix |
|---|---|---|---|
| A1 | Lists silently truncated by hard caps with client paging | `events-page.tsx:67` (`limit: 100`), `exams-page.tsx:137` (100), `admin-users-page.tsx:41` (200); ~50 such caps overall | Use `loadListPage` server paging where no client-only filter is active; where a cap stays, show "showing N of total" |
| A2 | "Empty trash" deletes without confirmation | `messages-page.tsx:152` | `ConfirmDialog` with count |
| A3 | Back button leaves the app on deep links | `app-shell.tsx:133` `window.history.back()` | Navigate to route parent when history has no in-app entry |
| A4 | Breadcrumbs only on course, exam and instance details | audit | Breadcrumbs on every durable detail page (event, homework, meal, class, question, whiteboard, admin user) derived from `nav-items.ts` labels |
| A5 | Data states inconsistent; dashboard `quiet()` shows failure as "no data"; calendar empty arrays read as "no events" | `dashboard-page.tsx:717`, `calendar-page.tsx:152` | One `DataState` contract: loading / empty / no-results (with "clear filters") / error (with retry) / partial |
| A6 | Some list errors may escape to the root `ErrorBoundary` (`app.tsx:61`) and replace the shell with a 500 | audit, **unverified** — reproduce first | Route-level error boundary inside the shell |
| A7 | 50 `SidePanel` forms: no dirty guard, no field errors (`aria-invalid` used once), mostly silent success (7 toasts) | audit | `SidePanel` dirty guard on Esc/outside click; field-level errors wired with `aria-invalid`/`aria-describedby`; success toast on save |
| A8 | A11y gaps: command palette has no ARIA roles; toasts not live regions; 12 unlabeled icon buttons (incl. `date-picker.tsx:149,153`); English "Close"/"Dismiss" labels | audit | combobox/listbox roles, `role="status"` toasts, i18n labels, skip link |
| A9 | Contrast: `text-primary` (#00ADD8 on white ≈ 2.6:1) used 104×; warning ≈ 2.1:1 | audit | Darker text variants of brand/semantic colors for text; fills keep current colors |
| A10 | Server-paged tables sort only the current page | `payments-page.tsx:637`, `question-bank-page.tsx:250` | Server sort or disable sort on those columns |

## Layer B — Design-system tightening

- One token vocabulary: pick `text-muted-foreground`/`border-border`/`bg-card`
  or the `surface-*` set, codemod the other (528/175, 354/104, 89/84 uses).
- Consolidate: `Card` (0 uses vs 64 hand-built), one error presentation
  (`ErrorAlert` 41 / raw destructive `Alert` 88 / `<p>` 37), one `StatCard`
  (`profile-page.tsx:249` vs `dashboard/stat-tile.tsx`).
- Replace 241 raw Tailwind palette classes (calendar 84, role-badge 25).
- Minimum text size 12px; retire `text-[8-10px]` (74 uses).
- Resolve the radius contradiction in docs (`rounded-md` vs `rounded-lg` vs
  `rounded-2xl`) and the action-column width (110px vs `w-28`).
- Raw `<table>` in `karne-view.tsx:63`, `marks-report-view.tsx:115` → `DataTable`.
- Mobile: `DataTable` card mode under `sm` with per-column priority; show
  horizontal-scroll affordance (scrollbars are hidden globally, `index.css:531`).
- Dashboard: per-section `Suspense` + skeletons instead of one page spinner.
- Unique nav icons (`IconClock` used for 6 items).
- Refresh `docs/ui/navigation-patterns.md` (describes a `/school` hub and
  groups that no longer exist).
- A lint/review check for the rules above.

## Layer C — Professional product experience

Each item needs a backend contract check (`check-api-contract`) before design
is final; items without an endpoint are out of scope, not faked
(see "never fabricate data").

1. **Role "Today" home.** Teacher: today's lessons, roll calls not yet taken,
   grading queue. Student: due soon. Admin: school KPIs. Precedent: Google
   Classroom's role-tailored homepage, rolled out 2026-07-27 —
   https://workspaceupdates.googleblog.com/2026/07/redesigned-google-classroom-homepage-with-tailored-views-based-on-users-role.html
   Tension: the dashboard is observation-only today; "Today" links to actions
   but does not perform them — stays within the rule.
2. **Exception-based roll call.** Everyone starts Present, the teacher changes
   exceptions, then "Complete"; an untaken roll call gets a red badge on its
   lesson. Precedent: Veracross —
   https://www.iorad.com/player/2241624/Veracross-Portals--How-to-take-attendance
3. **Sentence insights with an action** ("3 students have not submitted
   homework → open homework"). Precedent:
   https://workspaceupdates.googleblog.com/2025/06/new-class-analytics-and-insights-in-google-classroom.html
4. **Parent feed** per child with type/date filters. Precedents: Brightwheel
   http://help.mybrightwheel.com/en/articles/942392-student-activity-feed,
   Schoology https://langleyhs.fcps.edu/sites/default/files/media/inline-files/Parent_Communication.pdf
5. **Notification hygiene:** quiet hours for staff, optional digest for
   parents. Precedent: ClassDojo
   https://help.classdojo.com/hc/en-us/articles/207359446-How-to-Set-or-Edit-Quiet-Hours
6. **Per-role onboarding checklist**, 3–5 items ticked by real events. Source:
   https://docs.appcues.com/best-practices/checklist-best-practices

Why it matters: in TALIS 2024, 48% of teachers in Türkiye name administrative
work as a source of stress —
https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/10/results-from-talis-2024-country-notes_eafd703e/turkiye_f16e16f9/754c2c1a-en.pdf

## Standards referenced

- WCAG 2.2 AA additions: 2.4.11 Focus Not Obscured, 2.5.7 Dragging Movements
  (whiteboard needs a non-drag path), 2.5.8 Target Size ≥ 24px —
  https://www.audioeye.com/post/wcag-22/,
  https://w3c.github.io/wcag/understanding/focus-not-obscured-minimum
- Skeleton for page loads, spinner for single elements —
  https://www.nngroup.com/articles/skeleton-screens/
- Empty states teach and offer a path —
  https://www.nngroup.com/articles/empty-state-interface-design/
- Loading buttons keep their label; 16px mobile inputs; focus not hidden under
  sticky bars — https://vercel.com/design/guidelines

## Open questions

- A1: which list endpoints accept server-side filters/sort today? (check-api-contract)
- A6: reproduce the root-boundary failure before building the fix.
- C1–C5: which endpoints exist for untaken roll calls, grading queue, parent
  activity, reminders, notification preferences?
- B: which token vocabulary wins (`shadcn` names or `surface-*`)?

## Verification

Per layer: `bun run build`, vitest (dom project) for touched components,
Playwright `e2e/auth-shell.spec.ts`; a live visual pass with `agent-browser`
once E2E credentials are available.
