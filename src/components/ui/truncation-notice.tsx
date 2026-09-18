import { Show } from "solid-js";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/stores/preferences-context";

/** Says a capped list left rows out, with a way to fetch the rest. */
export function TruncationNotice(props: { shown: number; total: number; loading?: boolean; onLoadAll: () => void }) {
  const t = useT();
  return (
    <Show when={props.total > props.shown}>
      <Alert role="status" class="flex min-h-0 flex-wrap items-center justify-between gap-3 py-3">
        <span class="min-w-0 flex-1">{t("common.truncatedNotice", { shown: props.shown, total: props.total })}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          class="shrink-0"
          disabled={props.loading}
          onClick={() => props.onLoadAll()}
        >
          {t("common.loadAll")}
        </Button>
      </Alert>
    </Show>
  );
}
