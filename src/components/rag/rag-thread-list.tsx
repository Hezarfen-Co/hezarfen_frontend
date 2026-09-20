import { For, Show, createEffect, createSignal, on } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getRagThreads } from "@/api/rag";
import type { RagThread } from "@/api/client";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n/messages";

const THREAD_PAGE_SIZE = 12;
const DAY_MS = 86_400_000;

type Bucket = "today" | "yesterday" | "week" | "earlier";
const BUCKET_ORDER: Bucket[] = ["today", "yesterday", "week", "earlier"];

/** Which recency bucket a thread falls in, by local calendar day rather than a
 *  rolling 24 hours — "dün" has to mean yesterday's date, not 25 hours ago. */
function bucketOf(updatedAt: number, now: Date): Bucket {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (updatedAt >= startOfToday) return "today";
  if (updatedAt >= startOfToday - DAY_MS) return "yesterday";
  if (updatedAt >= startOfToday - 6 * DAY_MS) return "week";
  return "earlier";
}

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
    groupToday: string;
    groupYesterday: string;
    groupThisWeek: string;
    groupEarlier: string;
  };
  onOpen: (thread: RagThread) => void;
  onRename: (thread: RagThread) => void;
  onRemove: (thread: RagThread) => void;
}) {
  const [page, setPage] = createSignal(0);
  const [threads] = createResource(
    () => ({ page: page(), version: props.version }),
    ({ page }) => getRagThreads({ limit: THREAD_PAGE_SIZE, offset: page * THREAD_PAGE_SIZE }),
  );
  const totalPages = () => Math.max(1, Math.ceil((threads.latest?.total ?? 0) / THREAD_PAGE_SIZE));
  const bucketLabel = (bucket: Bucket) =>
    bucket === "today" ? props.labels.groupToday
      : bucket === "yesterday" ? props.labels.groupYesterday
      : bucket === "week" ? props.labels.groupThisWeek
      : props.labels.groupEarlier;
  // Grouping is presentational only — the page still comes from the server in
  // its own order, so an empty bucket simply does not get a heading.
  const groups = (items: RagThread[]) => {
    const now = new Date();
    return BUCKET_ORDER.flatMap((bucket) => {
      const rows = items.filter((thread) => bucketOf(thread.updated_at, now) === bucket);
      return rows.length > 0 ? [{ bucket, rows }] : [];
    });
  };

  createEffect(on(() => threads.latest, (result) => {
    if (result && result.items.length === 0 && page() > 0) setPage(Math.min(page() - 1, totalPages() - 1));
  }));

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <Show when={threads.latest} fallback={<PageSpinner />}>
          {(result) => (
            <Show
              when={result().items.length > 0}
              fallback={<EmptyInline class="h-full py-10" size="md" illustration="messages" title={props.labels.emptyThreads} hint={props.labels.emptyThreadsHint} />}
            >
              <For each={groups(result().items)}>
                {(group) => (
                  <section class="mb-3 last:mb-0">
                    <h3 class="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {bucketLabel(group.bucket)}
                    </h3>
                    <ul class="space-y-1.5">
                      <For each={group.rows}>
                        {(thread) => (
                          <li
                            class={cn(
                              "flex overflow-hidden rounded-lg border transition-colors",
                              thread.id === props.activeId ? "border-primary/40 bg-primary/5" : "border-border-hairline bg-card hover:border-border-line",
                            )}
                            aria-current={thread.id === props.activeId ? "true" : undefined}
                          >
                            <button
                              type="button"
                              class="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted/60"
                              onClick={() => props.onOpen(thread)}
                            >
                              <span class="w-full truncate text-sm font-medium">{thread.title || props.labels.untitled}</span>
                              <span class="text-[11px] tabular-nums text-muted-foreground">{formatDateTime(thread.updated_at, props.locale)}</span>
                            </button>
                            <TableRowActions
                              compact
                              label={props.labels.actions}
                              actions={[
                                { label: props.labels.rename, icon: <IconEdit class="h-4 w-4" />, onSelect: () => props.onRename(thread) },
                                { label: props.labels.delete, icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => props.onRemove(thread) },
                              ]}
                            />
                          </li>
                        )}
                      </For>
                    </ul>
                  </section>
                )}
              </For>
            </Show>
          )}
        </Show>
      </div>
      <Show when={totalPages() > 1}>
        <div class="mt-3 shrink-0">
          <PaginationControls page={page()} totalPages={totalPages()} onPageChange={setPage} />
        </div>
      </Show>
    </div>
  );
}
