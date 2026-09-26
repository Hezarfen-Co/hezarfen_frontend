import { Show, createEffect, on, onCleanup } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

/** Ask for the next page this far before the list's end scrolls into view. */
const LOAD_MARGIN_PX = 600;

/**
 * The end of a fetch-as-you-scroll list that is not a DataTable (card grids,
 * message lists). Sits under the last item, asks for the next page as it
 * nears the viewport, and says how much of the list is loaded. Pair with
 * `createInfiniteList`; DataTable has the same behaviour built in (`infinite`).
 */
export function InfiniteSentinel(props: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Rows loaded so far. */
  shown: number;
  total: number;
  class?: string;
}) {
  const t = useT();
  let sentinel: HTMLDivElement | undefined;
  // Without IntersectionObserver there is no reliable "near the end" signal,
  // so the next page waits for a button instead of chaining in on its own.
  const observing = typeof IntersectionObserver !== "undefined";

  const nearEnd = () => !!sentinel && sentinel.getBoundingClientRect().top < window.innerHeight + LOAD_MARGIN_PX;
  const maybeLoad = () => {
    if (props.hasMore && !props.loading && nearEnd()) props.onLoadMore();
  };

  createEffect(() => {
    if (!observing || !sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) maybeLoad();
    }, { rootMargin: `0px 0px ${LOAD_MARGIN_PX}px 0px` });
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });
  // A page that lands short of filling the screen leaves the sentinel in
  // view, where the observer will not fire again: check once more.
  createEffect(on(() => props.loading, (busy) => {
    if (!busy && observing) queueMicrotask(maybeLoad);
  }, { defer: true }));

  return (
    <Show when={props.total > 0}>
      <div ref={sentinel} aria-hidden="true" class="h-px" />
      <p class={cn("px-1 text-xs font-medium tabular-nums text-muted-foreground sm:text-[11px]", props.class)} aria-live="polite">
        {props.loading
          ? t("common.loadingMore")
          : props.hasMore
            ? t("common.showingOf", { shown: props.shown, total: props.total })
            : t("common.rowCount", { total: props.total })}
      </p>
      <Show when={!observing && props.hasMore && !props.loading}>
        <Button type="button" variant="outline" size="sm" onClick={() => props.onLoadMore()}>
          {t("common.loadMore")}
        </Button>
      </Show>
    </Show>
  );
}
