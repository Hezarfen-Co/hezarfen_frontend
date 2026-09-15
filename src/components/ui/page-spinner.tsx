import { useT } from "@/stores/preferences-context";

export function PageSpinner() {
  const t = useT();
  return (
    <div class="flex min-h-[min(60vh,28rem)] w-full flex-col items-center justify-center gap-3 py-10" role="status">
      <div class="h-9 w-9 animate-spin rounded-sm border-2 border-primary/20 border-t-primary" />
      <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}
