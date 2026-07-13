import { useT } from "@/stores/preferences-context";

export function PageSpinner() {
  const t = useT();
  return (
    <div class="flex flex-col items-center justify-center gap-3 py-20" role="status">
      <div class="h-9 w-9 animate-spin rounded-sm border-2 border-primary/20 border-t-primary" />
      <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
    </div>
  );
}
