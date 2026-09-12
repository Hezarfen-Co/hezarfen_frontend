import { For, Show, type Component } from "solid-js";
import { IconChevronRight } from "@/components/ui/icons";

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
  onOpen: (row: QuickLinkRow) => void;
};

/** Figma "Resource Columns" from ADM-01: a subtle column header and a short
 * list of resource rows with a trailing caption, each navigating to the
 * resource's real detail page. */
export function QuickLinkColumn(props: QuickLinkColumnProps) {
  return (
    <div class="flex min-w-0 flex-1 flex-col rounded-xl border border-border-line bg-surface-base px-4 py-3">
      <p class="pb-2 text-[13px] font-medium text-text-subtle">{props.title}</p>
      <Show when={props.rows.length > 0} fallback={<p class="border-t border-border-hairline py-3 text-[13px] text-text-subtle">{props.empty}</p>}>
        <For each={props.rows}>
          {(row) => (
            <button
              type="button"
              onClick={() => props.onOpen(row)}
              class="flex w-full items-center gap-2.5 border-t border-border-hairline py-2.5 text-left first:border-t-0"
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
