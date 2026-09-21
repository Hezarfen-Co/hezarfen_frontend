import { For, Show, createEffect, createSignal, on } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getChatbotThreads, type ChatbotThread } from "@/api/chatbot";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const THREAD_PAGE_SIZE = 10;

/**
 * Chat history as its own view inside the Çelebi panel. Pages come from the
 * server (`limit`/`offset`), so a long history never loads whole or turns the
 * panel header into an endless strip of chips.
 */
export function CelebiThreadList(props: {
  activeId?: string;
  /** Bumped by the panel after a rename, delete, or new answer to refetch the page. */
  version: number;
  onOpen: (thread: ChatbotThread) => void;
  onRename: (thread: ChatbotThread) => void;
  onRemove: (thread: ChatbotThread) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [page, setPage] = createSignal(0);
  const [threads] = createResource(
    () => ({ page: page(), version: props.version }),
    ({ page }) => getChatbotThreads({ limit: THREAD_PAGE_SIZE, offset: page * THREAD_PAGE_SIZE }),
  );
  const totalPages = () => Math.max(1, Math.ceil((threads.latest?.total ?? 0) / THREAD_PAGE_SIZE));

  // Deleting the last chat on the last page leaves that page empty; step back.
  createEffect(on(() => threads.latest, (result) => {
    if (result && result.items.length === 0 && page() > 0) setPage(Math.min(page() - 1, totalPages() - 1));
  }));

  return (
    <div class="flex h-full min-h-0 flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <Show when={threads.latest} fallback={<Show when={threads.loading}><PageSpinner /></Show>}>
          {(result) => (
            <Show
              when={result().items.length > 0}
              fallback={<EmptyInline class="h-full py-10" size="md" illustration="messages" title={t("ai.chats")} hint={t("ai.noChats")} />}
            >
              <ul class="flex flex-col gap-1.5">
                <For each={result().items}>
                  {(thread) => (
                    <li class={cn("flex items-center overflow-hidden rounded-lg border border-border", thread.id === props.activeId ? "bg-accent" : "bg-card")}>
                      <button type="button" class="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted" onClick={() => props.onOpen(thread)}>
                        <span class="w-full truncate text-sm font-medium text-foreground">{thread.title || t("ai.untitledChat")}</span>
                        <span class="text-xs text-muted-foreground">{formatDateTime(thread.updated_at, locale())}</span>
                      </button>
                      <button type="button" class="flex h-full min-h-12 w-9 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={t("ai.renameChat")} onClick={() => props.onRename(thread)}>
                        <IconEdit class="h-3.5 w-3.5" />
                      </button>
                      <button type="button" class="flex h-full min-h-12 w-9 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive-text" aria-label={t("ai.deleteChat")} onClick={() => props.onRemove(thread)}>
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
          <TablePagination pageIndex={page()} pageCount={totalPages()} onPageChange={setPage} />
        </div>
      </Show>
    </div>
  );
}
