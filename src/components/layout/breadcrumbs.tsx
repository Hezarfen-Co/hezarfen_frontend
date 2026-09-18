import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { useT } from "@/stores/preferences-context";

export type Crumb = {
  label: string;
  /** Route path, e.g. `/exams` or `/courses/$id`. Omit for the current page. */
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
};

/**
 * Hub → record trail above a detail page header. The last crumb is the
 * current page and is not a link.
 */
export function Breadcrumbs(props: { items: Crumb[] }) {
  const t = useT();
  return (
    <nav aria-label={t("common.breadcrumb")}>
      <ol class="detail-breadcrumb">
        <For each={props.items}>
          {(item, index) => {
            const last = () => index() === props.items.length - 1;
            return (
              <li class="flex min-w-0 items-center gap-1.5">
                <Show
                  when={item.to && !last()}
                  fallback={
                    <span class="truncate text-foreground" aria-current={last() ? "page" : undefined}>
                      {item.label}
                    </span>
                  }
                >
                  <Link to={item.to as never} params={item.params as never} search={(item.search ?? {}) as never} class="truncate">
                    {item.label}
                  </Link>
                </Show>
                <Show when={!last()}>
                  <span aria-hidden="true">›</span>
                </Show>
              </li>
            );
          }}
        </For>
      </ol>
    </nav>
  );
}
