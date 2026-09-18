import { Link } from "@tanstack/solid-router";
import { Button } from "@/components/ui/button";
import { IconChevronLeft, IconHome, IconSearch } from "@/components/ui/icons";
import { useGoBack } from "@/lib/use-go-back";
import { useT } from "@/stores/preferences-context";

export function NotFoundPage() {
  const t = useT();
  const goBack = useGoBack();
  return (
    <div class="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div class="w-full max-w-[420px] space-y-5 rounded-xl border border-border-line bg-surface-base p-8 text-center shadow-[0_10px_24px_-4px_rgba(0,0,0,0.10)]">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface-tint text-text-subtle">
          <IconSearch class="h-6 w-6" />
        </div>
        <div class="space-y-2">
          <p class="text-4xl font-semibold tracking-tight text-text-strong">404</p>
          <p class="text-base font-semibold text-text-strong">{t("common.notFound")}</p>
          <p class="text-sm leading-[21px] text-text-subtle">{t("errors.notFoundDescription")}</p>
        </div>
        <div class="flex items-center justify-center gap-2 pt-1">
          <Button type="button" variant="outline" onClick={goBack}>
            <IconChevronLeft class="mr-1 h-4 w-4" />
            {t("common.back")}
          </Button>
          <Link
            to="/"
            class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <IconHome class="mr-1 h-4 w-4" />
            {t("common.goHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
