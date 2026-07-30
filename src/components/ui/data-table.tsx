import { For, Show, createSignal } from "solid-js";
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
import { Button } from "@/components/ui/button";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { DataTableViewMenu, type ViewMenuColumn } from "@/components/ui/data-table-view-menu";
import { TablePagination } from "@/components/ui/table-pagination";
import { IconArrowDown, IconArrowUp, IconChevronsUpDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { createTablePreferences } from "@/lib/table-preferences";
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
  }
}

export type DataTableProps<TData, TValue = unknown> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  empty?: JSX.Element;
  class?: string;
  tableClass?: string;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  enableSorting?: boolean;
  filters?: JSX.Element;
  filterColumn?: string;
  filterPlaceholder?: string;
  title?: string;
  description?: string;
  actions?: JSX.Element;
  manualPagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (pageIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
  };
  onRowClick?: (row: TData) => void;
  onSearchInput?: (value: string) => void;
  pageSize?: number;
  searchPredicate?: (row: TData, query: string) => boolean;
  searchValue?: string;
  /**
   * When set, column widths / visibility / row density persist to localStorage.
   * Without a key the same controls remain available for the current mount.
   */
  storageKey?: string;
};

const resolveUpdater = <T,>(updater: Updater<T>, old: T): T =>
  typeof updater === "function" ? (updater as (value: T) => T)(old) : updater;

const alignClass = { left: "text-left", center: "text-center", right: "text-right" } as const;

export function DataTable<TData, TValue = unknown>(props: DataTableProps<TData, TValue>) {
  const t = useT();
  const paginationEnabled = props.enablePagination ?? true;
  const prefs = createTablePreferences(props.storageKey);
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [pagination, setPagination] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: props.pageSize ?? 10,
  });
  const [search, setSearch] = createSignal("");
  const searchValue = () => props.searchValue ?? search();
  const tableData = () => {
    const query = searchValue().trim();
    if (!query || !props.searchPredicate) return props.data;
    return props.data.filter((row) => props.searchPredicate?.(row, query));
  };
  const table = createSolidTable({
    get data() {
      return tableData();
    },
    get columns() {
      return props.columns;
    },
    enableSorting: props.enableSorting ?? true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginationEnabled && !props.manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) =>
      prefs.setVisibility(resolveUpdater(updater, prefs.preferences().visibility)),
    onPaginationChange: setPagination,
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
  const alignOf = (column: Column<TData, unknown>) => column.columnDef.meta?.align ?? "left";
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
  const actionColumnsWidth = () =>
    table.getVisibleLeafColumns().reduce(
      (total, column) => total + (stickyRightLocked(column.id) ? 110 : 0),
      0,
    );
  const tableWidth = () => dataColumnsWidth() + actionColumnsWidth();
  const columnWidth = (column: Column<TData, unknown>) => {
    if (stickyRightLocked(column.id)) return "110px";
    const total = dataColumnsWidth();
    if (total === 0) return `${column.getSize()}px`;
    const share = column.getSize() / total;
    return `calc(${share * 100}% - ${share * actionColumnsWidth()}px)`;
  };
  const showColumnMenu = () => (props.enableColumnVisibility ?? true) && hideableColumns().length > 0;
  const showSearch = () => props.searchPredicate != null || props.filterColumn != null || props.onSearchInput != null;
  const showHeader = () => props.title != null || props.description != null || props.actions != null;
  const showToolbar = () => showSearch() || props.filters != null || showColumnMenu();
  const pageCount = () => props.manualPagination ? Math.max(1, Math.ceil(props.manualPagination.total / props.manualPagination.pageSize)) : table.getPageCount();
  const pageIndex = () => props.manualPagination?.pageIndex ?? table.getState().pagination.pageIndex;
  const pageSize = () => props.manualPagination?.pageSize ?? table.getState().pagination.pageSize;
  const totalRows = () => props.manualPagination?.total ?? table.getFilteredRowModel().rows.length;
  const setPageIndex = (next: number) => {
    if (props.manualPagination) props.manualPagination.onPageChange(next);
    else table.setPageIndex(next);
  };
  const searchFieldValue = () => {
    if (props.onSearchInput || props.searchPredicate) return searchValue();
    if (props.filterColumn) return (table.getColumn(props.filterColumn)?.getFilterValue() as string) ?? "";
    return "";
  };
  const handleSearch = (value: string) => {
    if (props.onSearchInput) props.onSearchInput(value);
    else if (props.searchPredicate) setSearch(value);
    else if (props.filterColumn) table.getColumn(props.filterColumn)?.setFilterValue(value);
    setPageIndex(0);
  };
  const isInteractiveTarget = (target: EventTarget | null, row: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    const interactive = target.closest("button,a,input,select,textarea,[role='button']");
    return interactive != null && interactive !== row;
  };
  const renderHeader = (header: ReturnType<typeof table.getHeaderGroups>[number]["headers"][number]) => {
    const content = flexRender(header.column.columnDef.header, header.getContext());
    const align = alignOf(header.column);
    if (!(props.enableSorting ?? true) || !header.column.getCanSort()) {
      // The th already carries alignClass; the block span makes text-align resolve.
      return <span class="block truncate whitespace-nowrap">{content}</span>;
    }
    const sorted = () => header.column.getIsSorted();
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        // th text-align positions this inline-flex button; -ml-2 cancels the button's
        // px-2 so header text starts at the same gutter as the cell text below it.
        class={cn("h-8 min-w-0 max-w-full px-2 font-medium tracking-normal normal-case", align === "left" && "-ml-2", sorted() && "text-foreground")}
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
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <Show when={props.title}>
              <h2 class="truncate text-lg font-semibold tracking-tight text-foreground">{props.title}</h2>
            </Show>
            <Show when={props.description}>
              <p class="mt-1 text-sm text-muted-foreground">{props.description}</p>
            </Show>
          </div>
          <Show when={props.actions}>
            <div class="flex shrink-0 flex-wrap items-center gap-2 [&_button]:h-9 [&_button]:rounded-md">{props.actions}</div>
          </Show>
        </div>
      </Show>
      <Show when={showToolbar()}>
        <div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-1 flex-wrap items-center gap-2">
            <Show when={showSearch()}>
              <DataTableSearch
                value={searchFieldValue()}
                onChange={handleSearch}
                placeholder={props.filterPlaceholder ?? t("common.searchPlaceholder")}
              />
            </Show>
            <Show when={props.filters}>
              <div class="flex flex-wrap items-center gap-2 [&_button]:h-9 [&_button]:rounded-md [&_select]:h-9 [&_select]:rounded-md">{props.filters}</div>
            </Show>
          </div>
          <Show when={showColumnMenu()}>
            <div class="flex justify-end">
              <DataTableViewMenu columns={viewMenuColumns()} />
            </div>
          </Show>
        </div>
      </Show>
      <DataTableFrame>
        <Table
          class={cn("data-table table-fixed", props.tableClass)}
          style={{ width: `max(100%, ${tableWidth()}px)` }}
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
                          alignClass[alignOf(header.column)],
                          dividerClass(header.column),
                          stickyHeadClass(header.column),
                          header.column.columnDef.meta?.headerClass,
                          actionColumnClass(header.column.id),
                        )}
                        style={{ width: columnWidth(header.column) }}
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
                    {props.empty ?? t("common.noResults")}
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
                        const isEmpty = !isSystemColumn && (val == null || val === "");

                        return (
                          <TableCell
                            class={cn(
                              alignClass[alignOf(cell.column)],
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
      <Show when={paginationEnabled && totalRows() > 0}>
        <TablePagination
          pageIndex={pageIndex()}
          pageCount={pageCount()}
          pageSize={pageSize()}
          total={totalRows()}
          onPageChange={setPageIndex}
          onPageSizeChange={
            props.manualPagination
              ? props.manualPagination.onPageSizeChange
              : (size) => { table.setPageSize(size); setPageIndex(0); }
          }
        />
      </Show>
    </div>
  );
}

export function DataTableFrame(props: ParentProps<{ class?: string }>) {
  return <div class={cn("data-table-wrap", props.class)}>{props.children}</div>;
}

export function DataTableEmpty(props: ParentProps<{ class?: string }>) {
  return (
    <div class={cn("rounded-lg border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center text-sm leading-6 text-muted-foreground", props.class)}>
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
