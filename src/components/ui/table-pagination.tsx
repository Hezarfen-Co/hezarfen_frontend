import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

export type TablePaginationProps = {
  /** Zero-based current page index. */
  pageIndex: number;
  pageCount: number;
  pageSize: number;
  /** Total row count (across all pages). */
  total: number;
  onPageChange: (pageIndex: number) => void;
};

/** Footer: "X kayıttan a-b arası" + prev/next + "page / total". */
export function TablePagination(props: TablePaginationProps) {
  const t = useT();
  const start = () => (props.total === 0 ? 0 : props.pageIndex * props.pageSize + 1);
  const end = () => Math.min((props.pageIndex + 1) * props.pageSize, props.total);

  return (
    <div class="flex w-full flex-col gap-2 rounded-lg border border-border-line bg-surface-overlay px-2.5 py-1.5 sm:flex-row sm:items-center sm:justify-between">
      <span class="text-[11px] font-medium tabular-nums text-muted-foreground">
        {t("common.pageRange", { start: start(), end: end(), total: props.total })}
      </span>
      <div class="flex items-center justify-end gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 gap-1 px-1.5 text-[11px]"
          disabled={props.pageIndex <= 0}
          onClick={() => props.onPageChange(Math.max(0, props.pageIndex - 1))}
        >
          <IconChevronLeft class="h-3 w-3" />
          <span class="hidden sm:inline">{t("common.prev")}</span>
        </Button>
        <span class="min-w-12 rounded-md border border-border-line bg-surface-base px-1.5 py-0.5 text-center text-[11px] font-semibold tabular-nums text-foreground">
          {t("common.pageOf", { page: props.pageIndex + 1, total: props.pageCount })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 gap-1 px-1.5 text-[11px]"
          disabled={props.pageIndex >= props.pageCount - 1}
          onClick={() => props.onPageChange(Math.min(props.pageCount - 1, props.pageIndex + 1))}
        >
          <span class="hidden sm:inline">{t("common.next")}</span>
          <IconChevronRight class="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
