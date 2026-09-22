import { Link, useLocation, useRouter } from "@tanstack/solid-router";
import { currentLocale } from "@/api/client";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { listPathFor } from "@/lib/record-list-path";

/**
 * What a detail page shows when its record does not exist (a 404 — deleted,
 * or a bad link): there is nothing to retry, so it offers the way back to the
 * list instead. Also rendered by the router's error fallback, which can sit
 * above the i18n provider, hence the client's bilingual-fallback idiom.
 */
export function RecordNotFound(props: { backTo?: string }) {
  const router = useRouter();
  const location = useLocation();
  const tr = () => currentLocale() === "tr";
  const backTo = () =>
    props.backTo ?? listPathFor(location().pathname, (path) => path in router.routesByPath);
  return (
    <EmptyState
      kind="search"
      class="mx-auto w-full max-w-[640px]"
      title={tr() ? "Kayıt bulunamadı" : "Record not found"}
      description={
        tr()
          ? "Bu kayıt silinmiş ya da bağlantı hatalı olabilir."
          : "This record may have been deleted, or the link is wrong."
      }
      action={
        <Link to={backTo()} class={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-lg px-4")}>
          {backTo() === "/" ? (tr() ? "Ana sayfaya dön" : "Back to home") : tr() ? "Listeye dön" : "Back to the list"}
        </Link>
      }
    />
  );
}
