import { For, Show, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getRagThreads } from "@/api/rag";
import type { RagThread } from "@/api/client";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/messages";

// One growing page instead of numbered pages: a chat sidebar scrolls, it does
// not paginate. The API caps a page at 500 rows.
const THREAD_PAGE_SIZE = 40;
const THREAD_PAGE_MAX = 500;

export function RagThreadList(props: {
  activeId?: string;
  version: number;
  locale: Locale;
  labels: {
    untitled: string;
    emptyThreads: string;
    emptyThreadsHint: string;
    rename: string;
    actions: string;
    delete: string;
    loadMore: string;
    threadsFailed: string;
    tryAgain: string;
    groupToday: string;
    groupYesterday: string;
    groupThisWeek: string;
    groupEarlier: string;
  };
  /** Every thread the list holds, for callers that need a title by id. */
  onThreads?: (threads: RagThread[]) => void;
  onOpen: (thread: RagThread) => void;
  onRename: (thread: RagThread) => void;
  onRemove: (thread: RagThread) => void;
}) {
  const [limit, setLimit] = createSignal(THREAD_PAGE_SIZE);
  const [threads, { refetch }] = createResource(
    () => ({ limit: limit(), version: props.version }),
    ({ limit }) => getRagThreads({ limit, offset: 0 }),
  );
  createEffect(() => {
    const result = threads.latest;
    if (result) props.onThreads?.(result.items);
  });
  const hasMore = () => {
    const result = threads.latest;
    return !!result && result.total > result.items.length && limit() < THREAD_PAGE_MAX;
  };
  return (
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {/* A failed first read used to spin forever: `latest` never arrives. */}
      <Show when={threads.error && !threads.latest}>
        <div class="space-y-2 px-2.5 py-6 text-center text-sm text-muted-foreground" role="alert">
          <p>{props.labels.threadsFailed}</p>
          <button
            type="button"
            class="inline-flex h-10 items-center rounded-full border border-border-line px-3.5 text-[13px] font-medium text-foreground outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:h-8 touch:h-10"
            onClick={() => void refetch()}
          >
            {props.labels.tryAgain}
          </button>
        </div>
      </Show>
      <Show when={threads.latest} fallback={<Show when={!threads.error}><PageSpinner /></Show>}>
        {(result) => (
          <Show
            when={result().items.length > 0}
            fallback={<EmptyInline class="h-full py-10" size="md" illustration="messages" title={props.labels.emptyThreads} hint={props.labels.emptyThreadsHint} />}
          >
            <ul class="space-y-px">
              <For each={result().items}>
                {(thread) => {
                  const active = () => thread.id === props.activeId;
                  return (
                    <li
                      class={cn(
                        "group relative flex items-center rounded-lg transition-colors",
                        active() ? "bg-muted" : "hover:bg-muted/60",
                      )}
                      aria-current={active() ? "true" : undefined}
                    >
                      <button
                        type="button"
                        class={cn(
                          "min-w-0 flex-1 truncate rounded-lg py-2.5 pl-2.5 pr-10 text-left text-sm lg:py-1.5 lg:pr-8 touch:py-2.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                          active() ? "font-medium text-foreground" : "text-foreground/85",
                        )}
                        title={thread.title || props.labels.untitled}
                        onClick={() => props.onOpen(thread)}
                      >
                        {thread.title || props.labels.untitled}
                      </button>
                      {/* The row menu shows on hover, on keyboard focus and on the open chat. */}
                      <div
                        class={cn(
                          "absolute right-0 top-1/2 -translate-y-1/2 transition-opacity lg:right-1 [&_[data-row-actions-trigger]]:size-10 lg:[&_[data-row-actions-trigger]]:size-7 touch:[&_[data-row-actions-trigger]]:size-10 focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100",
                          active() ? "opacity-100" : "opacity-0",
                        )}
                      >
                        <TableRowActions
                          compact
                          label={props.labels.actions}
                          actions={[
                            { label: props.labels.rename, icon: <IconEdit class="h-4 w-4" />, onSelect: () => props.onRename(thread) },
                            { label: props.labels.delete, icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => props.onRemove(thread) },
                          ]}
                        />
                      </div>
                    </li>
                  );
                }}
              </For>
            </ul>
            <Show when={hasMore()}>
              <button
                type="button"
                class="mt-1 h-10 w-full rounded-lg px-2.5 text-left text-xs font-medium text-muted-foreground outline-hidden transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 lg:h-8 touch:h-10"
                disabled={threads.loading}
                onClick={() => setLimit((value) => Math.min(THREAD_PAGE_MAX, value + THREAD_PAGE_SIZE))}
              >
                {props.labels.loadMore}
              </button>
            </Show>
          </Show>
        )}
      </Show>
    </div>
  );
}
