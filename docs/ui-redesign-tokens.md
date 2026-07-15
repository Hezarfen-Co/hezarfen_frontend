# UI Redesign Tokens

## Direction

Dense school admin UI: Fintables-style tables, Cloudflare-style grouped sidebar,
neutral surfaces, subtle borders, one blue accent.

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
- radius: 12px base token (`0.75rem`), with `rounded-lg`/`rounded-xl` used for modern form and card surfaces
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

## Current Implementation Notes

- Data-heavy admin and management views should prefer `DataToolbar`, `DataTableFrame`, and `.data-table`.
- Row-level table actions should use `TableRowActions`; avoid inline action button clusters in table rows.
- Quick create/edit flows should use `SidePanel`; destructive actions stay in confirm dialogs.
- Durable resources keep full detail pages with breadcrumbs.
- Large detail sections can use `SectionDisclosure`; choose deferred mounting for request savings or mounted content for state preservation.
- Product date inputs should use the shared `DatePicker`; date-time flows should pair it with a compact `HH:mm` input.
- Sidebar icons are local SVG wrappers to keep development builds small and avoid large icon package module graphs.
- User-facing tables should prefer usernames/display names over raw ids; show raw ids only as fallback or in explicit id columns.
- Header actions use compact icon + label buttons with equal min-width; related sections should use matching badge labels and button sizing.
- Attendance status UI uses shared metadata: localized label, short detail text, and semantic color classes.

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
