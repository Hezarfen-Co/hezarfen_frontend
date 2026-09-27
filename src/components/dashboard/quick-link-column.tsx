import { For, Show, onCleanup, type Component } from "solid-js";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconChevronRight } from "@/components/ui/icons";
import type { IllustrationName } from "@/lib/illustrations";

export type QuickLinkRow = {
  id: string;
  primary: string;
  secondary?: string;
  Icon: Component<{ class?: string }>;
};

export type QuickLinkColumnProps = {
  title: string;
  rows: QuickLinkRow[];
  empty: string;
  illustration?: IllustrationName;
  onVisible?: () => void;
  onOpen: (row: QuickLinkRow) => void;
};

/** Figma "Resource Columns" from ADM-01: a subtle column header and a short
 * list of resource rows with a trailing caption, each navigating to the
 * resource's real detail page. */
export function QuickLinkColumn(props: QuickLinkColumnProps) {
  const observe = (el: HTMLDivElement) => {
    if (!props.onVisible) return;
    if (typeof IntersectionObserver === "undefined") {
      props.onVisible();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        props.onVisible?.();
      }
    }, { rootMargin: "160px" });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  };
  return (
    <div ref={observe} class="flex min-w-0 flex-1 flex-col rounded-xl border border-border-line bg-surface-base px-4 py-3">
      <p class="pb-2 text-[13px] font-medium text-text-subtle">{props.title}</p>
      <Show when={props.rows.length > 0} fallback={<EmptyInline class="border-t border-border-hairline" illustration={props.illustration} title={props.empty} />}>
        <For each={props.rows}>
          {(row) => (
            <button
              type="button"
              onClick={() => props.onOpen(row)}
              class="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 border-t border-border-hairline px-2 py-2.5 text-left outline-hidden transition-colors first:border-t-0 hover:bg-surface-tint focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <row.Icon class="h-[15px] w-[15px] shrink-0 text-text-subtle" />
              <span class="min-w-0 flex-1 truncate text-sm text-text-default">{row.primary}</span>
              <Show when={row.secondary}>
                <span class="shrink-0 text-xs text-text-subtle">{row.secondary}</span>
              </Show>
              <IconChevronRight class="h-3 w-3 shrink-0 text-text-subtle" />
            </button>
          )}
        </For>
      </Show>
    </div>
  );
}
