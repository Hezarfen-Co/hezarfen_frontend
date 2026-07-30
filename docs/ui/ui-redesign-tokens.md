# UI Redesign Tokens

## Source

bDash is Hezarfen's visual source of truth. Hezarfen keeps its SolidJS
architecture, Kobalte behavior, content model, workflows, semantic status colors,
and accessibility. React/Radix implementation details are not copied.

## Color

Light:

- background, card, popover, sidebar: `#F8F9FA`
- foreground: `#212529`
- primary: `#495057`; primary foreground: `#F8F9FA`
- secondary and muted: `#DEE2E6`
- accent and border: `#CED4DA`
- input: `#ADB5BD`; muted foreground and ring: `#6C757D`

Dark:

- background, card, popover, sidebar: `#212529`
- foreground: `#F8F9FA`
- primary: `#CED4DA`; primary foreground: `#212529`
- secondary and muted: `#495057`
- accent: `#6C757D`; border: `#495057`; input: `#6C757D`
- muted foreground: `#CED4DA`; ring: `#ADB5BD`

Success, warning, destructive, and info remain semantic. Custom palette choice
continues to override `--ui-accent`, which feeds `--primary`.

## Typography

- UI: native system sans (`ui-sans-serif`, `system-ui`, `-apple-system`,
  `BlinkMacSystemFont`, `Segoe UI`)
- Data: `ui-monospace`, `SFMono-Regular`, Menlo, Monaco, Consolas
- No downloaded UI fonts and no display-font override
- Default body/control text: `14px`; metadata: `12px`; table headers: `11px`

## Shape, size, elevation

- Base radius: `0.5rem`
- Controls and menus: `rounded-md`
- Cards and tables: `rounded-lg`
- Resource/page header: `rounded-xl`
- Default control: `h-9`; small control: `h-8`; large control: `h-10`
- Content surfaces: `shadow-sm`; menus/popovers: `shadow-xl shadow-black/10`
- Dialogs and side panels: `shadow-2xl shadow-black/20`
- Content surfaces stay opaque. Blur is limited to modal overlays and table
  headers where hierarchy needs it.

## Shared primitives

`Button`, `Input`, `Textarea`, `Select`, `Card`, `Badge`, `Table`, `Tabs`,
`Dialog`, `DropdownMenu`, `Popover`, `Alert`, `Label`, `DatePicker`,
`SidePanel`, `PageHeader`, empty/error states, and shell chrome use these tokens.
Page/domain components must not restore old oversized radius, control height,
display-font, translucent surface, or custom shadow rules.

## DataTable

- Table shell: `rounded-lg border bg-card`
- Header: sticky, `text-xs` medium **Title Case** (no uppercase transform),
  `tracking-normal`, muted foreground/background
- Body: flat rows (no zebra), restrained hover, `tabular-nums` cells so digits
  align vertically without a monospace font
- Cell padding: fixed `py-3` (no density / row-height toggle)
- The rightmost action/update column stays fixed at `110×45px`, centered, sticky
  right, and inherits the exact opaque row surface
- Data columns fill the available table width at a consistent proportional width.
  Column resizing is not offered (no resize handles, no width persistence)
- Search / filter / column controls: compact `h-8 rounded-lg` + `text-[13px]` (not pill)
- Pagination includes range, optional page-size selector, previous/next, and page
  count
- `storageKey` remains optional. When provided, only column visibility persists
  under `hezarfen.table.<storageKey>`.
- Application tables use `DataTable`; page/domain components do not render table
  primitives directly.

## Layout rules

- Table-primary pages place title, description, filters, and actions in
  `DataTable`.
- Durable resources use full detail pages. Short create/edit/filter work uses
  `SidePanel`; destructive actions use confirm dialogs.
- Page-header create/add actions use `size="sm"` with a shared minimum width.
- Dashboard stays read-only and role-scoped. Charts and counts use live data only.
- Dates use shared `DatePicker`; date-time flows pair it with a separate `HH:mm`
  input.
- Collapsed and expanded sidebar behavior stays equivalent. Collapsed groups
  remain dropdown triggers; icons remain `h-4 w-4`.
