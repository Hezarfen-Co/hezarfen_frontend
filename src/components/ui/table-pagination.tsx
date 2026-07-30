import { Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/select";
import { useT } from "@/stores/preferences-context";

export type TablePaginationProps = {
  /** Zero-based current page index. */
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  /** Total row count (across all pages). */
  total: number;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

/** Footer: "X kayıttan a-b arası" + page-size select + prev/next + "page / total". */
export function TablePagination(props: TablePaginationProps) {
  const t = useT();
  const options = () => props.pageSizeOptions ?? [10, 25, 50];
  const start = () => (props.total === 0 ? 0 : props.pageIndex * props.pageSize + 1);
  const end = () => Math.min((props.pageIndex + 1) * props.pageSize, props.total);

  return (
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <span class="text-sm tabular-nums text-muted-foreground">
        {t("common.pageRange", { start: start(), end: end(), total: props.total })}
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <Show when={props.onPageSizeChange}>
          <DropdownSelect
            triggerClass="h-8 rounded-md text-xs"
            value={String(props.pageSize)}
            options={options().map((size) => ({
              value: String(size),
              label: t("common.rowsPerPage", { size }),
            }))}
            onChange={(value) => props.onPageSizeChange?.(Number(value))}
          />
        </Show>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.pageIndex <= 0}
          onClick={() => props.onPageChange(Math.max(0, props.pageIndex - 1))}
        >
          {t("common.prev")}
        </Button>
        <span class="text-sm tabular-nums text-muted-foreground">
          {t("common.pageOf", { page: props.pageIndex + 1, total: props.pageCount })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.pageIndex >= props.pageCount - 1}
          onClick={() => props.onPageChange(Math.min(props.pageCount - 1, props.pageIndex + 1))}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
