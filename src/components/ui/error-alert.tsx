import { Show } from "solid-js";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/stores/preferences-context";

export function ErrorAlert(props: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <Alert variant="destructive" class="flex flex-wrap items-center justify-between gap-3">
      <span class="min-w-0 flex-1">{props.message}</span>
      <Show when={!!props.onRetry}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          class="shrink-0 rounded-lg border-destructive/40"
          onClick={() => props.onRetry?.()}
        >
          {t("common.tryAgain")}
        </Button>
      </Show>
    </Alert>
  );
}
