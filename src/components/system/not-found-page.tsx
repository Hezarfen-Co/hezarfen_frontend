import { Link } from "@tanstack/solid-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronLeft, IconHome } from "@/components/ui/icons";
import { PAGE_STATE_CARD, PageCenter } from "@/components/layout/page-center";
import { useGoBack } from "@/lib/use-go-back";
import { cn } from "@/lib/cn";
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
            <Button type="button" variant="outline" size="sm" class="h-9 rounded-lg px-4 text-sm" onClick={goBack}>
              <IconChevronLeft class="mr-1 h-4 w-4" />
              {t("common.back")}
            </Button>
            <Link
              to="/"
              class={cn(buttonVariants(), "h-9 px-4")}
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
