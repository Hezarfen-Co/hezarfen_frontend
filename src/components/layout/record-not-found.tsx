import { Link, useLocation, useRouter } from "@tanstack/solid-router";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_STATE_CARD, PageCenter, pageStateText as tt } from "@/components/layout/page-center";
import { cn } from "@/lib/cn";
import { listPathFor } from "@/lib/record-list-path";

/**
 * What a detail page shows when its record does not exist (a 404 — deleted,
 * or a bad link): there is nothing to retry, so it offers the way back to the
 * list instead. Centered in the content column like the route error view.
 * Also rendered by the router's error fallback, which can sit above the i18n
 * provider, hence `pageStateText` instead of `useT()`.
 */
export function RecordNotFound(props: { backTo?: string }) {
  const router = useRouter();
  const location = useLocation();
  const backTo = () =>
    props.backTo ?? listPathFor(location().pathname, (path) => path in router.routesByPath);
  return (
    <PageCenter>
      <EmptyState
        kind="search"
        class={PAGE_STATE_CARD}
        title={tt("errors.recordNotFound.title")}
        description={tt("errors.recordNotFound.description")}
        action={
          <Link to={backTo()} class={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-lg px-4")}>
            {backTo() === "/" ? tt("errors.recordNotFound.backHome") : tt("errors.recordNotFound.backToList")}
          </Link>
        }
      />
    </PageCenter>
  );
}
