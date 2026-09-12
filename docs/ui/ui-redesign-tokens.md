# UI Redesign Tokens

## Source

The `Hezarfen App Design` Figma file (`E8K670gsUx87yMOySGWrKf`) is the layout
and component source of truth. The public landing project at
`/Users/burakboduroglu/Projects/hezarfen` is the brand source of truth for the
logo and blue palette. Hezarfen keeps its SolidJS architecture, Kobalte
behavior, content model, workflows, semantic status colors, and accessibility.
Static sample content from Figma never replaces live application data.

## Color

Light:

- brand and brand accent: `#00ADD8`; brand hover: `#0097BD`
- surface/base: `#FFFFFF`; surface/overlay: `#F7F7F7`
- surface/tint: `#F5F5F5`; surface/fill: `#E5E5E5`
- text/strong: `#0A0A0A`; text/default: `#18181B`
- text/subtle: `#737373`; text/placeholder: `#A1A1A1`
- border/line: `rgba(10, 10, 10, 0.1)`; border/hairline: `#E9E9E9`

Dark:

- surface/base and background: `#0F0F0F`
- surface/overlay, tint, and fill: `#262626`
- text/strong: `#FAFAFA`; text/default: `#F5F5F5`
- text/subtle and placeholder: `#A1A1A1`; border: `#333333`
- brand stays `#00ADD8`; brand hover stays `#0097BD`

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
- Cards, tables, dialogs, and empty states: `rounded-xl`
- Page headers are plain content hierarchy, not decorative cards
- Default control: `h-9`; small button: `26px`; tabs: `32px`; badges: `20px`
- Content surfaces use a hairline border without a standing shadow; menus and
  overlays use the documented contextual elevation
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

- Table shell: `rounded-xl border-border-line bg-surface-base`
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
