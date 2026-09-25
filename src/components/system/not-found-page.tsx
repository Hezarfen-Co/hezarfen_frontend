import { Link } from "@tanstack/solid-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronLeft, IconHome } from "@/components/ui/icons";
import { PAGE_STATE_CARD, PageCenter } from "@/components/layout/page-center";
import { useGoBack } from "@/lib/use-go-back";
import { useT } from "@/stores/preferences-context";

/** The router's 404: same centered, illustrated card as a missing record. */
export function NotFoundPage() {
  const t = useT();
  const goBack = useGoBack();
  return (
    <PageCenter>
      <EmptyState
        kind="search"
        class={PAGE_STATE_CARD}
        eyebrow="404"
        pageHeading
        title={t("common.notFound")}
        description={t("errors.notFoundDescription")}
        action={
          <div class="flex flex-wrap items-center justify-center gap-2">
            <Button type="button" variant="outline" size="sm" class="h-9 rounded-lg px-4" onClick={goBack}>
              <IconChevronLeft class="mr-1 h-4 w-4" />
              {t("common.back")}
            </Button>
            <Link
              to="/"
              class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <IconHome class="mr-1 h-4 w-4" />
              {t("common.goHome")}
            </Link>
          </div>
        }
      />
    </PageCenter>
  );
}
