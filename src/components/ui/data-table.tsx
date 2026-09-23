import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js";
import type { JSX, ParentProps } from "solid-js";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type Updater,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import { Illustration } from "@/components/ui/illustration";
import type { IllustrationName } from "@/lib/illustrations";
import { Button } from "@/components/ui/button";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { DataTableViewMenu, type ViewMenuColumn } from "@/components/ui/data-table-view-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { IconArrowDown, IconArrowUp, IconChevronsUpDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createMediaQuery } from "@/lib/create-media-query";
import { COMPACT_SCREEN_QUERY, createResponsivePageSize } from "@/lib/create-page-size";
import { createTablePreferences } from "@/lib/table-preferences";
import { createUrlPageIndex, createUrlParam, createUrlString, decodeSort, encodeSort, listParamKeys } from "@/lib/url-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/stores/preferences-context";

declare module "@tanstack/solid-table" {
  interface ColumnMeta<TData, TValue> {
    headerClass?: string;
    cellClass?: string;
    label?: string;
    /** Header + cell horizontal alignment. Applied to both so they never drift apart. */
    align?: "left" | "center" | "right";
    /** Freeze this column to the left edge on horizontal scroll. */
    stickyLeft?: boolean;
    /** Vertical divider on the given edge — separates frozen label from metric columns. */
    divider?: "left" | "right";
    /** Leave this column out of the phone card layout (e.g. a column that only matters on a wide table). */
    hideInCards?: boolean;
  }
}

export type DataTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  empty?: JSX.Element;
  /** Scene shown above `empty`; defaults to a generic empty / no-results one. */
  emptyIllustration?: IllustrationName;
  class?: string;
  tableClass?: string;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  filters?: JSX.Element;
  filterColumn?: string;
  filterPlaceholder?: string;
  /** On-focus hint under the search box naming the fields it matches. */
  filterHint?: string;
  title?: string;
  description?: string;
  actions?: JSX.Element;
  manualPagination?: {
    pageIndex: number;
    /** The size the caller actually fetched — pass a `createResponsivePageSize` accessor's value. */
    pageSize: number;
    total: number;
    onPageChange: (pageIndex: number) => void;
  };
  /**
   * Below the `sm` breakpoint rows render as cards (first column as the
   * title, actions top-right, the rest as label/value pairs) instead of a
   * table that scrolls sideways. "scroll" keeps the table on phones too.
   */
  mobileLayout?: "cards" | "scroll";
  onRowClick?: (row: TData) => void;
  onSearchInput?: (value: string) => void;
  /** Rows per page on a wide screen; phones get `compactPageSize` of it. */
  pageSize?: number;
  searchPredicate?: (row: TData, query: string) => boolean;
  searchValue?: string;
  /**
   * When set, column widths / visibility / row density persist to localStorage.
   * Without a key the same controls remain available for the current mount.
   */
  storageKey?: string;
  /** Split the title/toolbar and table into the same inner surfaces as detail pages. */
  surfaceSections?: boolean;
  /**
   * Keep search, page and sort in the URL (`?q=`, `?page=`, `?sort=`) so Back
   * and a reload restore them. A string prefixes the keys (`?roster.q=`) for
   * a page with more than one list. Needs a router; only the search the table
   * owns (`searchPredicate` / `filterColumn`) is stored — a caller passing
   * `searchValue` / `onSearchInput` keeps its own.
   */
  urlState?: boolean | string;
  /** Back to page one whenever this changes — pass the caller's own filters. */
  pageResetKey?: unknown;
  /**
   * The caller's own filters narrow the list. An empty result then offers
   * `onClearFilters` instead of the "nothing here yet" message.
   */
  filtersActive?: boolean;
  onClearFilters?: () => void;
};

const resolveUpdater = <T,>(updater: Updater<T>, old: T): T =>
  typeof updater === "function" ? (updater as (value: T) => T)(old) : updater;

const alignClass = { left: "text-left", center: "text-center", right: "text-right" } as const;

export function DataTable<TData, TValue = unknown>(props: DataTableProps<TData, TValue>) {
  const t = useT();
  const paginationEnabled = props.enablePagination ?? true;
  const prefs = createTablePreferences(props.storageKey);
  // Read once: a table either keeps its state in the URL or it does not.
  const urlKeys = props.urlState
    ? listParamKeys(typeof props.urlState === "string" ? props.urlState : undefined)
    : null;
  const [sorting, setSortingState] = urlKeys
    ? createUrlParam<SortingState>(urlKeys.sort, { parse: decodeSort, serialize: encodeSort })
    : createSignal<SortingState>([]);
  const [otherColumnFilters, setOtherColumnFilters] = createSignal<ColumnFiltersState>([]);
  const clientPageSize = createResponsivePageSize(props.pageSize ?? 10);
  const [clientPageIndex, setClientPageIndex] = urlKeys && !props.manualPagination
    ? createUrlPageIndex(urlKeys.page)
    : createSignal(0);
  const pagination = (): PaginationState => ({ pageIndex: clientPageIndex(), pageSize: clientPageSize() });
  // A page index means nothing once the page size changes under it (a phone
  // rotated, a window narrowed): start over rather than land mid-list.
  createEffect(on(clientPageSize, () => setClientPageIndex(0), { defer: true }));
  createEffect(on(() => props.pageResetKey, () => setClientPageIndex(0), { defer: true }));
  // The search box's text when the table owns it — the `searchPredicate`
  // query, or the `filterColumn` filter value.
  const [search, setSearch] = urlKeys && props.searchValue === undefined && !props.onSearchInput
    ? createUrlString(urlKeys.q)
    : createSignal("");
  const searchValue = () => props.searchValue ?? search();
  // The filterColumn filter is the search signal; any other column filter
  // stays local.
  const columnFilters = (): ColumnFiltersState => {
    const column = props.filterColumn;
    const query = search();
    if (!column || props.searchPredicate || props.onSearchInput || !query) return otherColumnFilters();
    return [...otherColumnFilters().filter((filter) => filter.id !== column), { id: column, value: query }];
  };
  const setColumnFilters = (next: ColumnFiltersState) => {
    const column = props.filterColumn;
    if (!column || props.searchPredicate || props.onSearchInput) {
      setOtherColumnFilters(next);
      return;
    }
    const own = next.find((filter) => filter.id === column);
    setSearch(typeof own?.value === "string" ? own.value : "");
    setOtherColumnFilters(next.filter((filter) => filter.id !== column));
  };
  // A sort order reshuffles every page: start from the first one.
  const setSorting = (next: SortingState) => {
    setSortingState(next);
    setClientPageIndex(0);
  };
  // Sorting is client-side only, and the backend takes no sort parameter: on
  // a server-paged table it would reorder the visible page alone while the
  // header claimed the whole list. Off there unless a caller opts in.
  const sortingEnabled = () => props.enableSorting ?? !props.manualPagination;
  const tableData = () => {
    const query = searchValue().trim();
    if (!query || !props.searchPredicate) return props.data;
    return props.data.filter((row) => props.searchPredicate?.(row, query));
  };
  const table = createSolidTable({
    defaultColumn: {
      size: 120,
      minSize: 72,
      maxSize: 360,
    },
    get data() {
      return tableData();
    },
    get columns() {
      return props.columns;
    },
    enableSorting: sortingEnabled(),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginationEnabled && !props.manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    // The page index is ours, not the table's: an automatic reset on every
    // new `data` array sent a page that rebuilds its rows on each read (a
    // clock tick, a fresh map) straight back to page one on "Sonraki", and
    // would wipe a page restored from the URL on the first refetch.
    autoResetPageIndex: false,
    onSortingChange: (updater) => setSorting(resolveUpdater(updater, sorting())),
    onColumnFiltersChange: (updater) => setColumnFilters(resolveUpdater(updater, columnFilters())),
    onColumnVisibilityChange: (updater) =>
      prefs.setVisibility(resolveUpdater(updater, prefs.preferences().visibility)),
    onPaginationChange: (updater) => setClientPageIndex(resolveUpdater(updater, pagination()).pageIndex),
    state: {
      get sorting() {
        return sorting();
      },
      get columnFilters() {
        return columnFilters();
      },
      get columnVisibility() {
        return prefs.preferences().visibility;
      },
      get pagination() {
        return props.manualPagination
          ? { pageIndex: props.manualPagination.pageIndex, pageSize: props.manualPagination.pageSize }
          : pagination();
      },
    },
  });
  const hiddenLocked = (columnId: string) => columnId === "actions" || columnId === "update";
  const stickyRightLocked = (columnId: string) =>
    columnId === "actions" || (columnId === "update" && table.getColumn("actions") == null);
  const isStickyLeft = (column: Column<TData, unknown>) => column.columnDef.meta?.stickyLeft === true;
  // Headers stay centred; body cells read from the left edge. System columns
  // (row actions, checkboxes) keep their controls centred under the header.
  const isSystemColumnId = (columnId: string) => ["actions", "update", "select"].includes(columnId);
  const alignOf = (column: Column<TData, unknown>) => isSystemColumnId(column.id) ? "center" as const : "left" as const;
  // Cell renderers written for the old centred layout carry their own
  // mx-auto / justify-center / text-center on their root; pull those to the
  // start. Direct children only: deeper centring (avatar initials, icon
  // buttons) is the widget's own layout, not the column's.
  const leftCellClass = (column: Column<TData, unknown>) => isSystemColumnId(column.id)
    ? undefined
    : "[&>.mx-auto]:mx-0 [&>.justify-center]:justify-start [&>.text-center]:text-left";
  const dividerClass = (column: Column<TData, unknown>) => {
    const divider = column.columnDef.meta?.divider;
    return divider === "left" ? "border-l border-border/70" : divider === "right" ? "border-r border-border/70" : undefined;
  };
  const actionColumnClass = (columnId: string) => stickyRightLocked(columnId) ? "table-action-cell h-[45px] w-[110px] min-w-[110px] max-w-[110px] px-2 py-0 text-center whitespace-nowrap" : undefined;
  const stickyHeadClass = (column: Column<TData, unknown>) =>
    isStickyLeft(column)
      ? "table-sticky-head-left sticky left-0 z-30"
      : stickyRightLocked(column.id)
        ? "table-sticky-head-right sticky right-0 z-30"
        : undefined;
  const stickyCellClass = (column: Column<TData, unknown>) =>
    isStickyLeft(column)
      ? "table-sticky-left sticky left-0 z-10"
      : stickyRightLocked(column.id)
        ? "table-sticky-right sticky right-0 z-10"
        : undefined;
  const hideableColumns = () => table.getAllColumns().filter((column) => column.getCanHide() && !hiddenLocked(column.id));
  const columnLabel = (column: Column<TData, unknown>) => {
    const header = column.columnDef.header;
    return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
  };
  const viewMenuColumns = (): ViewMenuColumn[] =>
    hideableColumns().map((column) => ({
      id: column.id,
      label: columnLabel(column),
      visible: column.getIsVisible(),
      toggle: (visible: boolean) => column.toggleVisibility(visible),
    }));
  const colSpan = () => Math.max(1, table.getVisibleLeafColumns().length);
  const dataColumnsWidth = () =>
    table.getVisibleLeafColumns().reduce(
      (total, column) => total + (stickyRightLocked(column.id) ? 0 : column.getSize()),
      0,
    );
  // The table scrolls sideways only once the frame is narrower than every
  // column at its floor: a column that declares `minSize` may shrink to it,
  // one that does not keeps its `size`. Sizing the table by `size` alone
  // made a tablet scroll a table that fit, and slid the last data column
  // under the sticky action column.
  const minTableWidth = () =>
    table.getVisibleLeafColumns().reduce(
      (total, column) =>
        total + (stickyRightLocked(column.id) ? 110 : Math.min(column.getSize(), column.columnDef.minSize ?? column.getSize())),
      0,
    );
  const columnWidth = (column: Column<TData, unknown>) => {
    if (stickyRightLocked(column.id)) return "110px";
    const total = dataColumnsWidth();
    if (total === 0) return `${column.getSize()}px`;
    // A plain percentage: Chrome treats a calc() that mixes % and px on a
    // table column as auto, which split every table into equal columns and
    // ignored each column's size. The shares sum to 100% beside the fixed
    // 110px action column; the fixed layout scales them into what is left.
    return `${(column.getSize() / total) * 100}%`;
  };
  const compactScreen = createMediaQuery(COMPACT_SCREEN_QUERY);
  const useCards = () => (props.mobileLayout ?? "cards") === "cards" && compactScreen();
  // Cards print every visible column as a label/value pair, so a column picker
  // there only hides lines; on phones it is one more control for nothing.
  const showColumnMenu = () => (props.enableColumnVisibility ?? true) && hideableColumns().length > 0 && !useCards();
  const showSearch = () => props.searchPredicate != null || props.filterColumn != null || props.onSearchInput != null;
  const sectioned = () => props.surfaceSections !== false;
  const showHeader = () => false;
  const showToolbar = () => showSearch() || props.filters != null || showColumnMenu() || props.actions != null;
  // A lone "Sütunlar" button does not need a card of its own: a full-width
  // box with one button at its far end only adds a layer (a third nested box
  // inside a detail tab). It sits bare at the right edge instead.
  const columnMenuOnly = () => showColumnMenu() && !showSearch() && props.filters == null && props.actions == null;
  const pageCount = () => props.manualPagination ? Math.max(1, Math.ceil(props.manualPagination.total / props.manualPagination.pageSize)) : table.getPageCount();
  const pageIndex = () => props.manualPagination?.pageIndex ?? table.getState().pagination.pageIndex;
  const pageSize = () => props.manualPagination?.pageSize ?? table.getState().pagination.pageSize;
  const totalRows = () => props.manualPagination?.total ?? table.getFilteredRowModel().rows.length;
  const setPageIndex = (next: number) => {
    if (props.manualPagination) props.manualPagination.onPageChange(next);
    else setClientPageIndex(next);
  };
  // A page past the end — rows deleted, a filter narrowed the list, a stale
  // `?page=` — slides back to the last page there is. Only once rows exist:
  // before the data arrives every page is "past the end".
  createEffect(() => {
    if (props.manualPagination || !paginationEnabled) return;
    const rows = table.getFilteredRowModel().rows.length;
    if (rows === 0) return;
    const last = Math.max(0, Math.ceil(rows / clientPageSize()) - 1);
    if (clientPageIndex() > last) setClientPageIndex(last);
  });
  const searchFieldValue = () => {
    if (props.onSearchInput || props.searchPredicate || props.filterColumn) return searchValue();
    return "";
  };
  const handleSearch = (value: string) => {
    if (props.onSearchInput) props.onSearchInput(value);
    else setSearch(value);
    setPageIndex(0);
  };
  const isInteractiveTarget = (target: EventTarget | null, row: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    // Solid bubbles a portalled element's events through its owner, so a pick
    // in a row's action menu (rendered in a portal) reaches the row too; it is
    // not a click on the row.
    if (row instanceof Node && !row.contains(target)) return true;
    const interactive = target.closest("button,a,input,select,textarea,[role='button']");
    return interactive != null && interactive !== row;
  };
  // A search or filter that matches nothing is not an empty list: say what
  // was asked for and offer the way back, instead of "nothing here yet".
  const activeQuery = () => searchFieldValue().trim();
  const narrowed = () => activeQuery() !== "" || props.filtersActive === true;
  const clearNarrowing = () => {
    if (activeQuery()) handleSearch("");
    if (props.filtersActive) props.onClearFilters?.();
  };
  const emptyContent = () => (
    <Show
      when={narrowed()}
      fallback={
        <div class="flex flex-col items-center gap-3">
          <Illustration name={props.emptyIllustration ?? "empty"} class="h-20 w-32" />
          <span>{props.empty ?? t("common.noResults")}</span>
        </div>
      }
    >
      <div class="flex flex-col items-center gap-3">
        <Illustration name="no-results" class="h-20 w-32" />
        <span class="max-w-full break-words">
          {activeQuery() ? t("common.noMatchesFor", { query: activeQuery() }) : t("common.noFilterMatches")}
        </span>
        <Show when={activeQuery() || props.onClearFilters}>
          <Button type="button" size="sm" variant="outline" onClick={clearNarrowing}>
            {props.filtersActive && props.onClearFilters ? t("common.clearFilters") : t("common.clearSearch")}
          </Button>
        </Show>
      </div>
    </Show>
  );
  const headerLabel = (columnId: string) => {
    const header = table.getFlatHeaders().find((candidate) => candidate.column.id === columnId);
    return header ? flexRender(header.column.columnDef.header, header.getContext()) : columnId;
  };
  // Screen readers hear the order only through aria-sort on the header cell.
  const ariaSort = (column: Column<TData, unknown>) => {
    if (!sortingEnabled() || !column.getCanSort()) return undefined;
    const sorted = column.getIsSorted();
    return sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none";
  };
  const renderHeader = (header: ReturnType<typeof table.getHeaderGroups>[number]["headers"][number]) => {
    const content = flexRender(header.column.columnDef.header, header.getContext());
    if (!sortingEnabled() || !header.column.getCanSort()) {
      return <span class="block truncate whitespace-nowrap text-center">{content}</span>;
    }
    const sorted = () => header.column.getIsSorted();
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class={cn("mx-auto h-8 min-w-0 max-w-full justify-center px-2 text-center font-medium tracking-normal normal-case", sorted() && "text-foreground")}
        onClick={() => header.column.toggleSorting(sorted() === "asc")}
      >
        <span class="truncate">{content}</span>
        <Show
          when={sorted() !== false}
          fallback={
            <IconChevronsUpDown class="h-3.5 w-3.5 opacity-0 transition-opacity group-hover/head:opacity-50 group-focus-within/head:opacity-50" />
          }
        >
          <Show
            when={sorted() === "asc"}
            fallback={<IconArrowDown class="h-3.5 w-3.5" />}
          >
            <IconArrowUp class="h-3.5 w-3.5" />
          </Show>
        </Show>
      </Button>
    );
  };

  return (
    <div class={cn("space-y-3", props.class)}>
      <Show when={showHeader()}>
        <div class={cn("flex flex-wrap items-start justify-between gap-3", sectioned() && "rounded-xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4")}>
          <div class="min-w-0">
            <Show when={props.title}>
              <h2 class="truncate text-lg font-semibold tracking-tight text-foreground">{props.title}</h2>
            </Show>
            <Show when={props.description}>
              <p class="mt-1 text-sm text-muted-foreground">{props.description}</p>
            </Show>
          </div>
          <Show when={props.actions}>
            <div class="flex min-w-0 flex-wrap items-center gap-2 [&_button]:rounded-md">{props.actions}</div>
          </Show>
        </div>
      </Show>
      <Show when={showToolbar()}>
        {/* One wrapping row, ordered by width. Phones: search and actions share
            the first line, filters get a line of their own that scrolls
            sideways instead of stacking one control per line. From `lg`:
            search, filters, then actions pushed to the right edge. Controls
            are touch-sized (h-10) below `sm` and compact (h-8) above it. */}
        <div class={cn("flex flex-wrap items-center gap-2", sectioned() && !columnMenuOnly() && "rounded-xl border border-border-line bg-surface-base p-3 shadow-xs")}>
          <Show when={showSearch()}>
            <DataTableSearch
              class="order-1 w-auto min-w-40 flex-1 grow-[100] sm:max-w-xs"
              value={searchFieldValue()}
              onChange={handleSearch}
              placeholder={props.filterPlaceholder ?? t("common.searchPlaceholder")}
              hint={props.filterHint}
            />
          </Show>
          <Show when={props.filters}>
            <div class="order-3 -my-1 flex w-full items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] sm:my-0 sm:py-0 sm:flex-wrap sm:overflow-visible lg:order-2 lg:w-auto [&_button]:h-10 [&_button]:shrink-0 [&_button]:rounded-lg [&_button]:text-[13px] sm:[&_button]:h-8 touch:[&_button]:h-10 [&_select]:h-10 [&_select]:rounded-lg [&_select]:text-[13px] sm:[&_select]:h-8 touch:[&_select]:h-10 max-sm:[&>*]:flex-nowrap max-sm:[&>*]:shrink-0">{props.filters}</div>
          </Show>
          <Show when={props.actions || showColumnMenu()}>
            {/* Beside the search the actions keep their own width (the search
                out-grows them 100:1). A label too long to fit there wraps to
                a line of its own, where the sole grower takes the full row and
                the button stretches instead of hanging off the right edge. */}
            <div class="order-2 ml-auto flex shrink-0 grow flex-wrap items-center justify-end gap-2 sm:grow-0 lg:order-3">
              <Show when={props.actions}>
                <div class="flex min-w-0 flex-wrap items-center gap-2 [&_button]:rounded-md max-sm:flex-1 touch:[&_button]:h-10 max-sm:[&_button]:flex-1">{props.actions}</div>
              </Show>
              <Show when={showColumnMenu()}>
                <DataTableViewMenu columns={viewMenuColumns()} />
              </Show>
            </div>
          </Show>
        </div>
      </Show>
      <Show when={useCards()}>
        <ul class="space-y-2" aria-label={props.title}>
          <Show
            when={table.getRowModel().rows.length > 0}
            fallback={<li class="rounded-lg border border-border-line bg-surface-base px-4 py-8 text-center text-sm text-muted-foreground">{emptyContent()}</li>}
          >
            <For each={table.getRowModel().rows}>
              {(row) => {
                const cells = () =>
                  row.getVisibleCells().filter((cell) => cell.column.id !== "select" && !cell.column.columnDef.meta?.hideInCards);
                const action = () => cells().find((cell) => cell.column.id === "actions");
                const body = () => cells().filter((cell) => cell.column.id !== "actions");
                // A "-" line only makes a phone card taller: leave out fields
                // with no value. Display columns draw themselves from
                // row.original, so they have no value to test and always stay.
                const details = () =>
                  body().slice(1).filter((cell) => cell.column.accessorFn == null || (cell.getValue() != null && cell.getValue() !== ""));
                return (
                  <li>
                  <div
                    role={props.onRowClick ? "button" : undefined}
                    tabIndex={props.onRowClick ? 0 : undefined}
                    class={cn(
                      "rounded-lg border border-border-line bg-surface-base p-3 text-sm",
                      props.onRowClick && "cursor-pointer outline-hidden focus-visible:ring-2 focus-visible:ring-ring active:bg-primary/6",
                    )}
                    onClick={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target, event.currentTarget)) return;
                      props.onRowClick(row.original);
                    }}
                    onKeyDown={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target, event.currentTarget) || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      props.onRowClick(row.original);
                    }}
                  >
                    <div class="flex items-start gap-2">
                      <div class="min-w-0 flex-1 font-medium">
                        <Show when={body()[0]}>{(first) => flexRender(first().column.columnDef.cell, first().getContext())}</Show>
                      </div>
                      {/* The row menu shrinks to its ⋮ glyph here — the word
                          beside it cost the title a third of the card width. */}
                      <Show when={action()}>{(cell) => <div class="-my-1 shrink-0 [&_[data-row-actions-label]]:hidden [&_[data-row-actions-trigger]]:h-10 [&_[data-row-actions-trigger]]:w-10 [&_[data-row-actions-trigger]]:min-w-0 [&_[data-row-actions-trigger]]:px-0">{flexRender(cell().column.columnDef.cell, cell().getContext())}</div>}</Show>
                    </div>
                    <Show when={details().length > 0}>
                      {/* Two fields per line, label over value: a label/value
                          row per field made every card as tall as its column
                          count. Cells are written for a centred table column,
                          so the card pulls their content back to the left, and
                          a status pill sized for that column's width shrinks
                          back to its own label. */}
                      <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                        <For each={details()}>
                          {(cell) => (
                            <div class="min-w-0">
                              <dt class="truncate text-[11px] leading-4 text-muted-foreground">{headerLabel(cell.column.id)}</dt>
                              <dd class="mt-0.5 min-w-0 break-words text-[13px] leading-5 text-foreground text-left [&_*]:text-left [&_.items-center]:items-start [&_.justify-center]:justify-start [&_.justify-end]:justify-start [&_.mx-auto]:mx-0 [&_[data-slot=badge]]:w-auto [&_[data-slot=badge]]:min-w-0 [&_[data-slot=badge]]:max-w-full [&_[data-slot=badge]]:items-center!">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </dd>
                            </div>
                          )}
                        </For>
                      </dl>
                    </Show>
                  </div>
                  </li>
                );
              }}
            </For>
          </Show>
        </ul>
      </Show>
      <Show when={!useCards()}>
      {/* No inner padding: the header row sits flush on the card's top edge.
          A padded frame left it floating inside the card, and the sticky
          header then pinned below that padding while rows scrolled through
          the gap above it. */}
      <DataTableFrame class={sectioned() ? "shadow-xs" : undefined}>
        <Table
          class={cn("data-table table-fixed", props.tableClass)}
          style={{ width: `max(100%, ${minTableWidth()}px)` }}
        >
          <colgroup>
            <For each={table.getVisibleLeafColumns()}>
              {(column) => <col style={{ width: columnWidth(column) }} />}
            </For>
          </colgroup>
          <TableHeader>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow class="hover:bg-transparent">
                  <For each={headerGroup.headers}>
                    {(header) => (
                      <TableHead
                        colSpan={header.colSpan}
                        class={cn(
                          "group/head relative overflow-hidden",
                          dividerClass(header.column),
                          stickyHeadClass(header.column),
                          header.column.columnDef.meta?.headerClass,
                          actionColumnClass(header.column.id),
                        )}
                        style={{ width: columnWidth(header.column) }}
                        aria-sort={ariaSort(header.column)}
                      >
                        <Show when={!header.isPlaceholder}>{renderHeader(header)}</Show>
                      </TableHead>
                    )}
                  </For>
                </TableRow>
              )}
            </For>
          </TableHeader>
          <TableBody>
            <Show
              when={table.getRowModel().rows.length > 0}
              fallback={
                <TableRow>
                  <TableCell colSpan={colSpan()} class="py-8 text-center text-muted-foreground">
                    {emptyContent()}
                  </TableCell>
                </TableRow>
              }
            >
              <For each={table.getRowModel().rows}>
                {(row) => (
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    role={props.onRowClick ? "button" : undefined}
                    tabIndex={props.onRowClick ? 0 : undefined}
                    class={cn(
                      "group/row",
                      props.onRowClick && "cursor-pointer outline-hidden focus-visible:bg-primary/6 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/8",
                    )}
                    onClick={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target, event.currentTarget)) return;
                      props.onRowClick(row.original);
                    }}
                    onKeyDown={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target, event.currentTarget) || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      props.onRowClick(row.original);
                    }}
                  >
                    <For each={row.getVisibleCells()}>
                      {(cell) => {
                        const val = cell.getValue();
                        const isText = typeof val === "string" || typeof val === "number";
                        const isSystemColumn = ["actions", "update", "select"].includes(cell.column.id);
                        // A display column (no accessorFn/accessorKey) has no
                        // value to be empty — getValue() is always undefined —
                        // so it must render its own `cell`, or a column that
                        // draws itself from row.original silently shows "-".
                        const isDisplayColumn = cell.column.accessorFn == null;
                        const isEmpty =
                          !isSystemColumn && !isDisplayColumn && (val == null || val === "");

                        return (
                          <TableCell
                            class={cn(
                              alignClass[alignOf(cell.column)],
                              leftCellClass(cell.column),
                              dividerClass(cell.column),
                              stickyCellClass(cell.column),
                              cell.column.columnDef.meta?.cellClass,
                              actionColumnClass(cell.column.id),
                            )}
                            style={{ width: columnWidth(cell.column) }}
                            title={isText && !isEmpty ? String(val) : undefined}
                          >
                            <Show when={!isEmpty} fallback={<span class="text-muted-foreground/40">-</span>}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Show>
                          </TableCell>
                        );
                      }}
                    </For>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
        </Table>
      </DataTableFrame>
      </Show>
      <Show when={paginationEnabled && totalRows() > 0}>
        <TablePagination
          pageIndex={pageIndex()}
          pageCount={pageCount()}
          pageSize={pageSize()}
          total={totalRows()}
          onPageChange={setPageIndex}
        />
      </Show>
    </div>
  );
}

export function DataTableFrame(props: ParentProps<{ class?: string }>) {
  const t = useT();
  let frame: HTMLDivElement | undefined;
  const [scrollable, setScrollable] = createSignal(false);
  const checkOverflow = () => setScrollable(!!frame && frame.scrollWidth > frame.clientWidth + 2);
  createEffect(() => {
    queueMicrotask(checkOverflow);
    if (typeof ResizeObserver === "undefined" || !frame) return;
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(frame);
    onCleanup(() => observer.disconnect());
  });
  // The hint sits under the frame, not floated inside it: pinned to the
  // frame's bottom edge it covered the last row's action button.
  return (
    <div class="space-y-1">
      <div ref={frame} class={cn("data-table-wrap relative", props.class)} data-scrollable={scrollable() ? "" : undefined}>
        {props.children}
      </div>
      <Show when={scrollable()}>
        <p class="flex justify-end text-[11px] font-medium text-muted-foreground" aria-hidden="true">
          ↔ {t("common.scrollHint")}
        </p>
      </Show>
    </div>
  );
}

export function DataTableEmpty(props: ParentProps<{ class?: string }>) {
  return (
    <div class={cn("rounded-xl border border-dashed border-border-line bg-surface-overlay px-6 py-10 text-center text-sm leading-6 text-text-subtle", props.class)}>
      {props.children}
    </div>
  );
}

export function DataTableSkeleton(props: { rows?: number; columns?: number }) {
  const rows = () => Array.from({ length: props.rows ?? 6 });
  const columns = () => Array.from({ length: props.columns ?? 5 });
  return (
    <DataTableFrame class="animate-pulse">
      <table class="data-table">
        <thead>
          <tr>
            <For each={columns()}>
              {() => (
                <th>
                  <div class="h-2.5 w-20 rounded-full bg-muted" />
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <For each={rows()}>
            {() => (
              <tr>
                <For each={columns()}>
                  {() => (
                    <td>
                      <div class="h-3 w-full max-w-32 rounded-full bg-muted/80" />
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </DataTableFrame>
  );
}
