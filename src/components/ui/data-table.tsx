import { For, Show, createSignal } from "solid-js";
import type { JSX, ParentProps } from "solid-js";
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from "@tanstack/solid-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconChevronDown } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/stores/preferences-context";

declare module "@tanstack/solid-table" {
  interface ColumnMeta<TData, TValue> {
    headerClass?: string;
    cellClass?: string;
    label?: string;
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
  manualPagination?: {
    pageIndex: number;
    pageSize: number;
    total: number;
    onPageChange: (pageIndex: number) => void;
  };
  onRowClick?: (row: TData) => void;
  onSearchInput?: (value: string) => void;
  pageSize?: number;
  searchPredicate?: (row: TData, query: string) => boolean;
  searchValue?: string;
};

export function DataTable<TData, TValue = unknown>(props: DataTableProps<TData, TValue>) {
  const t = useT();
  const [sorting, setSorting] = createSignal<SortingState>([]);
  const [columnFilters, setColumnFilters] = createSignal<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = createSignal<VisibilityState>({});
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
    ...(props.enablePagination && !props.manualPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      get sorting() {
        return sorting();
      },
      get columnFilters() {
        return columnFilters();
      },
      get columnVisibility() {
        return columnVisibility();
      },
      get pagination() {
        return props.manualPagination
          ? { pageIndex: props.manualPagination.pageIndex, pageSize: props.manualPagination.pageSize }
          : pagination();
      },
    },
  });
  const hiddenLocked = (columnId: string) => columnId === "actions" || columnId === "update";
  const actionColumnClass = (columnId: string) => hiddenLocked(columnId) ? "w-28 min-w-[7rem] px-2 text-center whitespace-nowrap" : undefined;
  const hideableColumns = () => table.getAllColumns().filter((column) => column.getCanHide() && !hiddenLocked(column.id));
  const columnLabel = (column: Column<TData, unknown>) => {
    const header = column.columnDef.header;
    return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
  };
  const colSpan = () => Math.max(1, table.getVisibleLeafColumns().length);
  const showColumnMenu = () => (props.enableColumnVisibility ?? true) && hideableColumns().length > 0;
  const showSearch = () => props.searchPredicate != null || props.filterColumn != null || props.onSearchInput != null;
  const showToolbar = () => showSearch() || props.filters != null || showColumnMenu();
  const pageCount = () => props.manualPagination ? Math.max(1, Math.ceil(props.manualPagination.total / props.manualPagination.pageSize)) : table.getPageCount();
  const pageIndex = () => props.manualPagination?.pageIndex ?? table.getState().pagination.pageIndex;
  const setPageIndex = (next: number) => {
    if (props.manualPagination) props.manualPagination.onPageChange(next);
    else table.setPageIndex(next);
  };
  const isInteractiveTarget = (target: EventTarget | null) => target instanceof Element && target.closest("button,a,input,select,textarea,[role='button']") != null;
  const renderHeader = (header: ReturnType<typeof table.getHeaderGroups>[number]["headers"][number]) => {
    const content = flexRender(header.column.columnDef.header, header.getContext());
    if (!(props.enableSorting ?? true) || !header.column.getCanSort()) return content;
    const sorted = header.column.getIsSorted();
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class={cn("-ml-3 h-8 px-2", sorted && "text-foreground")}
        onClick={() => header.column.toggleSorting(sorted === "asc")}
      >
        {content}
        <IconChevronDown class={cn("h-3.5 w-3.5 opacity-50", sorted === "asc" && "rotate-180", sorted && "opacity-100")} />
      </Button>
    );
  };

  return (
    <>
      <Show when={showToolbar()}>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Show when={showSearch()}>
            <Input
              class="max-w-sm rounded-xl"
              value={props.onSearchInput || props.searchPredicate ? searchValue() : ((props.filterColumn ? table.getColumn(props.filterColumn)?.getFilterValue() : "") as string) ?? ""}
              placeholder={props.filterPlaceholder ?? t("common.searchPlaceholder")}
              onInput={(event) => {
                if (props.onSearchInput) props.onSearchInput(event.currentTarget.value);
                else if (props.searchPredicate) setSearch(event.currentTarget.value);
                else if (props.filterColumn) table.getColumn(props.filterColumn)?.setFilterValue(event.currentTarget.value);
                setPageIndex(0);
              }}
            />
          </Show>
          <Show when={props.filters}>
            <div class="flex flex-wrap items-center gap-2">{props.filters}</div>
          </Show>
          <Show when={showColumnMenu()}>
            <DropdownMenu placement="bottom-end" gutter={6}>
              <DropdownMenuTrigger class="ml-auto inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-background/80 px-4 text-xs font-semibold shadow-sm transition-all hover:bg-secondary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t("common.columns")}
                <IconChevronDown class="h-3.5 w-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-48 rounded-2xl border border-black/[0.08] bg-popover/95 p-1.5 shadow-apple backdrop-blur-xl dark:border-white/[0.12]">
                <For each={hideableColumns()}>
                  {(column) => (
                    <DropdownMenuCheckboxItem
                      class="rounded-lg"
                      checked={column.getIsVisible()}
                      onChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {columnLabel(column)}
                    </DropdownMenuCheckboxItem>
                  )}
                </For>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>
        </div>
      </Show>
      <DataTableFrame class={props.class}>
        <Table class={cn("data-table", props.tableClass)}>
          <TableHeader>
            <For each={table.getHeaderGroups()}>
              {(headerGroup) => (
                <TableRow>
                  <For each={headerGroup.headers}>
                    {(header) => (
                        <TableHead colSpan={header.colSpan} class={cn(actionColumnClass(header.column.id), header.column.columnDef.meta?.headerClass)}>
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
                    class={props.onRowClick ? "cursor-pointer outline-none focus-visible:bg-primary/[0.06] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-primary/[0.08]" : undefined}
                    onClick={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target)) return;
                      props.onRowClick(row.original);
                    }}
                    onKeyDown={(event) => {
                      if (!props.onRowClick || isInteractiveTarget(event.target) || (event.key !== "Enter" && event.key !== " ")) return;
                      event.preventDefault();
                      props.onRowClick(row.original);
                    }}
                  >
                    <For each={row.getVisibleCells()}>
                      {(cell) => (
                        <TableCell class={cn(actionColumnClass(cell.column.id), cell.column.columnDef.meta?.cellClass)}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )}
                    </For>
                  </TableRow>
                )}
              </For>
            </Show>
          </TableBody>
        </Table>
      </DataTableFrame>
      <Show when={props.enablePagination && pageCount() > 1}>
        <div class="flex items-center justify-end gap-2 py-3">
          <span class="mr-auto text-xs font-medium tabular-nums text-muted-foreground">
            {t("common.pageOf", { page: pageIndex() + 1, total: pageCount() })}
          </span>
          <Button type="button" variant="outline" size="sm" class="h-11 rounded-xl px-4 text-xs font-semibold tactile-press" disabled={pageIndex() <= 0} onClick={() => setPageIndex(Math.max(0, pageIndex() - 1))}>
            {t("common.prev")}
          </Button>
          <Button type="button" variant="outline" size="sm" class="h-11 rounded-xl px-4 text-xs font-semibold tactile-press" disabled={pageIndex() >= pageCount() - 1} onClick={() => setPageIndex(Math.min(pageCount() - 1, pageIndex() + 1))}>
            {t("common.next")}
          </Button>
        </div>
      </Show>
    </>
  );
}

export function DataTableFrame(props: ParentProps<{ class?: string }>) {
  return <div class={cn("data-table-wrap", props.class)}>{props.children}</div>;
}

export function DataTableEmpty(props: ParentProps<{ class?: string }>) {
  return (
    <div class={cn("rounded-2xl border border-dashed border-border/70 bg-muted/15 px-6 py-10 text-center text-sm leading-6 text-muted-foreground", props.class)}>
      {props.children}
    </div>
  );
}

export function DataTableSkeleton(props: { rows?: number; columns?: number }) {
  const rows = () => Array.from({ length: props.rows ?? 6 });
  const columns = () => Array.from({ length: props.columns ?? 5 });
  return (
    <DataTableFrame>
      <table class="data-table">
        <tbody>
          <For each={rows()}>
            {() => (
              <tr>
                <For each={columns()}>
                  {() => (
                    <td>
                      <div class="h-3 w-full max-w-32 animate-pulse rounded-sm bg-muted" />
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
