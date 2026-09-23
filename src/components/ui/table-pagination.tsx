import { Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

export type TablePaginationProps = {
  /** Zero-based current page index. */
  pageIndex: number;
  pageCount: number;
  /** With `total`, prints "a-b / total"; without either only the page counter shows. */
  pageSize?: number;
  /** Total row count (across all pages). */
  total?: number;
  onPageChange: (pageIndex: number) => void;
  class?: string;
};

/**
 * Footer: "a-b / total" + prev / "page / count" / next, on one row at every
 * width. The buttons are full touch targets on phones and touch screens,
 * compact otherwise. A single page keeps the row count but drops the buttons — two disabled
 * arrows around "1 / 1" only take room.
 */
export function TablePagination(props: TablePaginationProps) {
  const t = useT();
  const hasRange = () => props.total != null && props.pageSize != null;
  const start = () => (!props.total || !props.pageSize ? 0 : props.pageIndex * props.pageSize + 1);
  const end = () => Math.min((props.pageIndex + 1) * (props.pageSize ?? 0), props.total ?? 0);
  const navButton = "h-10 w-10 gap-1 px-0 text-xs sm:h-7 sm:w-auto sm:px-1.5 sm:text-[11px] touch:h-10 touch:min-w-10";

  return (
    // Nothing to count and nowhere to go: an empty frame would only take room.
    <Show when={hasRange() || props.pageCount > 1}>
    <div
      class={cn(
        "flex w-full items-center gap-2 rounded-lg border border-border-line bg-surface-overlay px-2.5 py-1.5",
        // With no row count to show, the empty left slot pushed the buttons
        // to the right edge; alone, they sit in the middle.
        hasRange() ? "justify-between" : "justify-center",
        props.class,
      )}
    >
      <Show when={hasRange()}>
        <span class="text-xs font-medium tabular-nums text-muted-foreground sm:text-[11px]">
          {t("common.pageRange", { start: start(), end: end(), total: props.total ?? 0 })}
        </span>
      </Show>
      <Show when={props.pageCount > 1}>
        <nav class="flex items-center gap-1" aria-label={t("common.pagination")}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class={navButton}
            aria-label={t("common.prev")}
            disabled={props.pageIndex <= 0}
            onClick={() => props.onPageChange(Math.max(0, props.pageIndex - 1))}
          >
            <IconChevronLeft class="h-4 w-4 sm:h-3 sm:w-3" />
            <span class="hidden sm:inline">{t("common.prev")}</span>
          </Button>
          <span class="min-w-14 rounded-md border border-border-line bg-surface-base px-1.5 py-1 text-center text-xs font-semibold tabular-nums text-foreground sm:min-w-12 sm:py-0.5 sm:text-[11px]">
            {t("common.pageOf", { page: props.pageIndex + 1, total: props.pageCount })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class={navButton}
            aria-label={t("common.next")}
            disabled={props.pageIndex >= props.pageCount - 1}
            onClick={() => props.onPageChange(Math.min(props.pageCount - 1, props.pageIndex + 1))}
          >
            <span class="hidden sm:inline">{t("common.next")}</span>
            <IconChevronRight class="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
        </nav>
      </Show>
    </div>
    </Show>
  );
}
