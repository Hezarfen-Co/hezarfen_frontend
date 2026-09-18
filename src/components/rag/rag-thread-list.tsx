import { For, Show, createEffect, createSignal, on } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getRagThreads } from "@/api/rag";
import type { RagThread } from "@/api/client";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/i18n/messages";

const THREAD_PAGE_SIZE = 12;

export function RagThreadList(props: {
  activeId?: string;
  version: number;
  locale: Locale;
  labels: { untitled: string; emptyThreads: string; emptyThreadsHint: string; rename: string; delete: string };
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
              <ul class="space-y-1.5">
                <For each={result().items}>
                  {(thread) => (
                    <li class={cn("flex overflow-hidden rounded-lg border border-border", thread.id === props.activeId ? "bg-accent" : "bg-card")}>
                      <button
                        type="button"
                        class="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted"
                        onClick={() => props.onOpen(thread)}
                      >
                        <span class="w-full truncate text-sm font-medium">{thread.title || props.labels.untitled}</span>
                        <span class="text-[11px] tabular-nums text-muted-foreground">{formatDateTime(thread.updated_at, props.locale)}</span>
                      </button>
                      <button
                        type="button"
                        class="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label={props.labels.rename}
                        onClick={() => props.onRename(thread)}
                      >
                        <IconEdit class="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        class="flex w-9 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-text"
                        aria-label={props.labels.delete}
                        onClick={() => props.onRemove(thread)}
                      >
                        <IconTrash class="h-3.5 w-3.5" />
                      </button>
                    </li>
                  )}
                </For>
              </ul>
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
