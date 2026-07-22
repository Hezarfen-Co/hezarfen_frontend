import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import { useT } from "@/stores/preferences-context";

export function PaginationControls(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useT();
  return (
    <div class="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-11 rounded-xl gap-1 px-4"
        disabled={props.page <= 0}
        onClick={() => props.onPageChange(Math.max(0, props.page - 1))}
      >
        <IconChevronLeft class="h-3.5 w-3.5" />
        {t("common.prev")}
      </Button>
      <span class="text-xs tabular-nums text-muted-foreground">
        {t("common.pageOf", { page: props.page + 1, total: props.totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="h-11 rounded-xl gap-1 px-4"
        disabled={props.page >= props.totalPages - 1}
        onClick={() => props.onPageChange(Math.min(props.totalPages - 1, props.page + 1))}
      >
        {t("common.next")}
        <IconChevronRight class="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
