# UI Redesign Tokens

## Direction

Dense school admin UI: Fintables-style tables, Cloudflare-style grouped sidebar
and status boards, neutral surfaces, subtle borders, one blue accent for
interactive chrome only. Dashboard and overview surfaces stay grayscale; color
is reserved for semantic status (success / warning / danger / info).

## Color

Light palette is defined in `src/index.css` as `--ui-*` variables:

- `--ui-bg`: `#f7f8f8`
- `--ui-surface-1`: `#ffffff`
- `--ui-surface-2`: `#f1f3f3`
- `--ui-surface-3`: `#e7eaea`
- `--ui-border-1`: `#d9dddd`
- `--ui-border-2`: `#c7cccc`
- `--ui-text-1`: `#101414`
- `--ui-text-2`: `#4b5555`
- `--ui-text-3`: `#788181`
- `--ui-accent`: ice-blue / teal-blue (`204 86% 48%` in HSL tokens)
- semantic colors: success, warning, danger, info, each with muted pair

Dark palette mirrors same token names with dark surfaces and brighter semantic
foregrounds.

Existing shadcn tokens (`--background`, `--card`, `--primary`, etc.) are mapped
to these `--ui-*` variables so existing components keep working.

## Typography

- UI face: `DM Sans`
- Data face: `.mono` / `.num`, using `ui-monospace, SFMono-Regular, Menlo,
  Monaco, Consolas`
- Display serif removed from data/admin pages; `.font-display` now maps to UI
  face for tighter dashboard hierarchy.

Scale target:

- `xs`: 12/16, labels and metadata
- `sm`: 13/18, nav and table cells
- `base`: 14/20, body
- `lg`: 18/24, section/page titles
- `xl`: 22/28, key page title only

## Spacing

CSS variables:

- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px

Density defaults:

- sidebar group/header row: 32px
- table header/cell row: 36px
- card padding: 16px
- radius: 12px base token (`0.75rem`), with token-derived `rounded-md`/`rounded-lg`/`rounded-xl` used by form, feedback, card, and panel surfaces
- table numerals/IDs use tabular mono
- table action column: narrow, centered, three-dot trigger
- table column separators: subtle border between cells, no heavy gridlines

## Proof Of Concept

Reference page: `src/pages/admin-users-page.tsx`.

Implemented:

- grouped accordion sidebar with active category auto-open
- compact stat row on top of users page
- dense sticky data table styling via `.data-table`
- centered row action dropdowns via `TableRowActions`
- role pills with semantic tints
- mono IDs and tabular metrics
- neutral surfaces, subtle borders, no gradients or decorative cards

## Dashboard (homepage)

Reference implementation: `src/pages/dashboard-page.tsx`.

### Intent

- Observation / navigation board, not a mutation surface.
- Cloudflare-style density: quiet borders, flat cards, mono counts, no vanity decoration.

### Structure

1. Header — greeting, neutral role chip, date.
2. Workspace portal cards — role-scoped section links.
3. Needs attention + Upcoming — two columns from `lg`, stacked on small screens.

### Portal card anatomy

```text
┌──────────────────────────────────────────────┐
│ [icon]  Courses  |  12                       │
│         Browse courses and class materials.  │
└──────────────────────────────────────────────┘
```

- Horizontal row: left icon box (muted border, no tinted fill), middle title + one-line description, count on the **same line as the title**.
- Desktop title/count separator: literal `|` in muted border color (`Title | 12`). Count uses `.mono` / tabular nums.
- No colored top bars, no per-card accent tints, no large stacked KPI under the description.
- Do not add a second KPI strip that repeats the same course/exam/event counts.
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`, compact padding (`px-3 py-3` / `sm:px-4`), min height ~4.5–5rem.
- Optional min-role badge is neutral (border + muted), hidden on the smallest width if it crowds the row.

### Attention / upcoming lists

- Divided list inside one bordered card; row is a full-width link.
- Status uses semantic color only (dot + small badge): active (emerald), today (amber), soon (muted).
- Empty states are plain text — never “create exam/event” CTAs.

### Out of scope for dashboard

- Activity bar charts, multi-color portal accents, guide/marketing footers, create shortcuts, redundant summary KPI tiles under the portal grid.

## Current Implementation Notes

- Data-heavy admin and management views should prefer `DataToolbar`, `DataTableFrame`, and `.data-table`.
- Row-level table actions should use `TableRowActions`; avoid inline action button clusters in table rows.
- Quick create/edit flows should use `SidePanel`; destructive actions stay in confirm dialogs.
- Durable resources keep full detail pages with breadcrumbs.
- Detail routes should use `.detail-breadcrumb`, `.detail-action-group`, `.detail-action-divider`, and `.detail-metric-card` before adding page-local header/card styling.
- Large detail sections can use `SectionDisclosure`; choose deferred mounting for request savings or mounted content for state preservation.
- Product date inputs should use the shared `DatePicker`; date-time flows should pair it with a compact `HH:mm` input.
- Icons are local Lucide-geometry SVG wrappers in `src/components/ui/icons.tsx` (24 grid, stroke 2, round caps/joins, `rx=2` on rounded rects). No icon package — keeps dev builds small. Prefer adding a path there over ad-hoc inline SVGs.
- User-facing tables should prefer usernames/display names over raw ids; show raw ids only as fallback or in explicit id columns.
- Header actions use compact icon + label buttons with equal min-width; related sections should use matching badge labels and button sizing.
- Form and feedback surfaces should use shared `Input`, `Select`, `Textarea`, `Alert`, `DataTableEmpty`, and `ConfirmDialog` primitives; avoid page-local destructive/empty-state boxes unless the primitive cannot express the state.
- Attendance status UI uses shared metadata: localized label, short detail text, and semantic color classes.
- Homepage/dashboard follows the **Dashboard (homepage)** section above; keep list pages dense-table oriented, not dashboard-card oriented.

Static wireframe:

```text
Students / Users
People & roles

[ Total ] [ Students ] [ Teachers ] [ Managers ] [ Admins ]

Directory                                     [ Search... ]
┌──────────┬────────────┬──────────────┬─────────┬──────────────┬────────┐
│ Username │ Name       │ Email        │ Role    │ ID           │ Update │
├──────────┼────────────┼──────────────┼─────────┼──────────────┼────────┤
│ ali      │ Ali Demir  │ ali@...      │ Student │ 01J...       │ select │
│ ayse     │ Ayse Kaya  │ —            │ Student │ 01J...       │ select │
│ mehmet   │ Mehmet Ar  │ mehmet@...   │ Teacher │ 01J...       │ select │
└──────────┴────────────┴──────────────┴─────────┴──────────────┴────────┘
```
