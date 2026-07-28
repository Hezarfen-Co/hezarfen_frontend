# UI Redesign Tokens

## Direction

Dense school admin UI with Apple HIG-inspired grouped surfaces: neutral grouped
backgrounds, subtle borders, translucent overlays, one blue accent for
interactive chrome only. Surfaces stay neutral; color is reserved for the blue
accent, dashboard charts (see "Charts" below), and semantic status (success /
warning / danger / info).

## Color

Light palette is defined in `src/index.css` as `--ui-*` variables:

- `--ui-bg`: `240 5% 96%`
- `--ui-surface-1`: `0 0% 100%`
- `--ui-surface-2`: `240 5% 92%`
- `--ui-surface-3`: `240 5% 88%`
- `--ui-border-1`: `240 5% 86%`
- `--ui-border-2`: `240 4% 78%`
- `--ui-text-1`: `240 10% 9%`
- `--ui-text-2`: `240 5% 35%`
- `--ui-text-3`: `240 4% 52%`
- `--ui-accent`: Apple system blue (`211 100% 50%`)
- semantic colors: success, warning, danger, info, each with muted pair

Dark palette follows dark.design aesthetics (deep obsidian canvas, `#121318` card surfaces, crisp hairline borders, electric dark accent):

- `--ui-bg`: `240 10% 3.9%` (`#09090b` canvas)
- `--ui-surface-1`: `240 6% 7.5%` (`#121318` card surface)
- `--ui-surface-2`: `240 6% 11.5%` (`#1b1c24` muted container / input)
- `--ui-surface-3`: `240 5% 15.5%` (`#242531` elevated popover)
- `--ui-border-1`: `240 5% 15%` (`#24252d` razor-sharp 1px border)
- `--ui-border-2`: `240 4% 22%` (`#343644` active border)
- `--ui-text-1`: `0 0% 98%` (`#fafafa` crisp heading text)
- `--ui-text-2`: `240 5% 68%` (`#a1a1aa` secondary body text)
- `--ui-text-3`: `240 4% 48%` (`#71717a` subtle label text)
- `--ui-accent`: Electric dark blue (`217 91% 60%`)
- semantic colors: luminous emerald, amber, rose, cyan

Existing shadcn tokens (`--background`, `--card`, `--primary`, etc.) are mapped
to these `--ui-*` variables so existing components keep working seamlessly.

## Typography

- UI face: system Apple stack (`-apple-system`, `BlinkMacSystemFont`, SF Pro,
  Helvetica Neue fallback)
- Data face: `.mono` / `.num`, using `ui-monospace, SFMono-Regular, Menlo,
  Monaco, Consolas`
- `.font-display` maps to the same system UI face with tighter letter spacing.

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
- radius: 16px base token (`1rem`), with `rounded-xl`/`rounded-2xl` used by form,
  feedback, card, and panel surfaces
- table numerals/IDs use tabular mono
- table action column: narrow, centered, three-dot trigger
- table column separators: subtle border between cells, no heavy gridlines

## Proof Of Concept

Reference page: `src/pages/admin-users-page.tsx`.

Implemented:

- fixed single-level role sidebar with one neutral raised active row
- compact stat row on top of users page
- dense sticky data table styling via `.data-table`
- centered row action dropdowns via `TableRowActions`
- role pills with semantic tints
- mono IDs and tabular metrics
- neutral surfaces, subtle borders, no gradients or decorative cards
- HIG shared primitives: rounded controls, frosted overlays, tactile press
  feedback, and 44px targets where layout allows

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

### Charts (Knowvio-style dashboard)

- The homepage uses the `Chart*` components in `src/components/ui/` (area trend,
  bar, progress ring) for a Highlights stat row + Progress-overview + Activity split,
  plus a `DataTable` of upcoming deadlines. Accent = `hsl(var(--primary))`; status
  tints stay semantic (emerald/amber/rose/muted).
- **Real data only:** every chart/stat maps to a live API field. No fabricated daily
  trends, streak counters, or `+%` delta badges. Hide a panel when its source is empty
  for the current role.

### Out of scope for dashboard

- Guide/marketing footers, create shortcuts, promotional/upgrade cards.
- Drag/drop ordering, fabricated trends / streaks, `+%` deltas, manual refresh controls.

## Current Implementation Notes

- Data-heavy admin and management views should prefer `DataToolbar`, `DataTableFrame`, and `.data-table`.
- Page header create/add buttons use compact icon + label controls with `size="sm" class="min-w-[7.5rem] rounded-lg"`; secondary header actions keep the same shape with `variant="outline"`.
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
│ Username │ Name       │ Email        │ Role    │ ID           │Update  │
├──────────┼────────────┼──────────────┼─────────┼──────────────┼────────┤
│ ali      │ Ali Demir  │ ali@...      │ Student │ 01J...       │ select │
│ ayse     │ Ayse Kaya  │ —            │ Student │ 01J...       │ select │
│ mehmet   │ Mehmet Ar  │ mehmet@...   │ Teacher │ 01J...       │ select │
└──────────┴────────────┴──────────────┴─────────┴──────────────┴────────┘
```

## Dropdowns & Select Elevation

- Dropdown menus (`DropdownMenu`), comboboxes (`Combobox`), popovers (`Popover`),
  dialogs, side panels, and toasts use squircle containers (`rounded-2xl` /
  `rounded-3xl`), frosted glass backdrop blur (`backdrop-blur-xl`), tactile
  press feedback, and 44px targets where layout allows. Native selects keep the
  same rounded 44px control shape; their option popup remains browser-owned.
- Table actions headers use `w-28 min-w-[7rem] text-center whitespace-nowrap` to ensure localized labels (`İŞLEMLER`, `Actions`) render without text truncation or overflow.
