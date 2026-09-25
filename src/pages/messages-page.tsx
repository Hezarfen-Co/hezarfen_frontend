import {
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  Suspense,
  useTransition,
} from "solid-js";
import { createResource } from "@/lib/create-resource";
import { RouteGuard } from "@/components/layout/route-guard";
import { TablePagination } from "@/components/ui/table-pagination";
import { Button } from "@/components/ui/button";
import {
  IconArchive,
  IconMessage,
  IconSend,
  IconTrash,
  IconPlus,
  IconRefresh,
} from "@/components/ui/icons";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { GmailMailRow } from "@/components/messages/gmail-mail-row";
import { GmailMailDetail } from "@/components/messages/gmail-mail-detail";
import { GmailComposeBox } from "@/components/messages/gmail-compose-box";
import { cn } from "@/lib/cn";
import {
  getMessages,
  patchMessageById,
  deleteMessageById,
} from "@/api/messages";
import type { Message, MessageFolder } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";
import { formatApiError } from "@/api/client";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { createDebouncedSignal } from "@/lib/create-debounced-signal";
import { createFlash } from "@/lib/flash";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const folders: { id: MessageFolder; labelKey: MessageKey; icon: typeof IconMessage }[] = [
  { id: "inbox", labelKey: "messages.inbox", icon: IconMessage },
  { id: "sent", labelKey: "messages.sent", icon: IconSend },
  { id: "archive", labelKey: "messages.archive", icon: IconArchive },
  { id: "trash", labelKey: "messages.trash", icon: IconTrash },
];

export default function MessagesPage() {
  const t = useT();
  const auth = useAuth();
  const [folder, setFolder] = createSignal<MessageFolder>("inbox");
  const [page, setPage] = createSignal(1);
  const limit = 30;
  const [selectedId, setSelectedId] = createSignal<string>("");
  const [query, setQuery, debouncedQuery] = createDebouncedSignal();
  const [composeOpen, setComposeOpen] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [isPending, startTransition] = useTransition();
  const [, setFlash] = createFlash();

  const [messagePage, { refetch }] = createResource(
    () => ({ f: folder(), p: page(), q: debouncedQuery().trim() }),
    async (args) =>
      await getMessages(args.f, {
        limit,
        offset: (args.p - 1) * limit,
        ...(args.q ? { q: args.q } : {}),
      })
  );
  createEffect(() => {
    const total = messagePage()?.total;
    if (total === undefined) return;
    const lastPage = Math.max(1, Math.ceil(total / limit));
    if (page() > lastPage) setPage(lastPage);
  });

  const [unreadCount, { refetch: refetchUnread }] = createResource(
    async () => (await getMessages("inbox", { read: false, limit: 1 })).total
  );

  const rawMessages = createMemo(() => messagePage()?.items ?? []);

  // En yeni mesaj en üstte sıralama
  const messages = createMemo(() =>
    rawMessages().slice().sort((a, b) => b.sent_at - a.sent_at)
  );

  const selected = createMemo(() => messages().find((m) => m.id === selectedId()) ?? null);
  const isOwnSentMessage = (msg: Message) => msg.sender.id === auth.user()?.id;

  const restoreFolder = (msg: Message): MessageFolder => {
    if (isOwnSentMessage(msg)) {
      return "sent";
    }
    if (
      msg.previous_folder &&
      (msg.previous_folder as string) !== "deleted" &&
      (msg.previous_folder as string) !== "archive"
    ) {
      return msg.previous_folder as MessageFolder;
    }
    return "inbox";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
      setFlash(t("messages.refreshedToast"));
    } catch (err: any) {
      console.error("Refresh error:", err);
      setFlash(formatApiError(err));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAction = async (
    msg: Message,
    action: { folder?: MessageFolder; delete?: boolean; read?: boolean }
  ) => {
    try {
      if (action.delete) {
        if (msg.folder !== "trash") {
          setFlash(t("messages.deleteForeverOnlyTrash"));
          return;
        }
        await deleteMessageById(msg.id);
        setFlash(t("messages.deletedToast"));
      } else if (action.folder) {
        await patchMessageById(msg.id, { folder: action.folder });
        setFlash(t("messages.movedToast"));
      } else if (action.read !== undefined) {
        if (isOwnSentMessage(msg)) {
          setFlash(t("messages.readOnlyReceived"));
          return;
        }
        await patchMessageById(msg.id, { read: action.read });
      }

      if (selectedId() === msg.id && (action.folder || action.delete)) {
        setSelectedId("");
      }
      await refetch();
      if (action.folder === "inbox" || msg.folder === "inbox" || action.read !== undefined) {
        await refetchUnread();
      }
    } catch (err: any) {
      console.error("Message action error:", err);
      setFlash(formatApiError(err));
    }
  };

  const [confirmEmptyTrash, setConfirmEmptyTrash] = createSignal(false);
  /** Empty trash deletes the loaded page only; the summary says so when more remain. */
  const emptyTrashSummary = () => {
    const count = messages().length;
    const total = messagePage()?.total ?? count;
    return total > count
      ? t("messages.emptyTrashPageSummary", { count, total })
      : t("messages.emptyTrashSummary", { count });
  };

  const handleEmptyTrash = async () => {
    const trashItems = messages();
    if (trashItems.length === 0) return;
    try {
      await Promise.all(trashItems.map((m) => deleteMessageById(m.id)));
      setFlash(t("messages.trashEmptiedToast"));
      setSelectedId("");
      await refetch();
    } catch (err: any) {
      console.error("Empty trash error:", err);
      setFlash(formatApiError(err));
    }
  };

  return (
    <RouteGuard>
      <div class="space-y-4">
        <div class="min-h-[50vh] sm:min-h-[calc(100vh-11rem)]">
        <section class="data-shell overflow-hidden p-0">
          <div class="flex min-h-[50vh] flex-col sm:min-h-[calc(100vh-11rem)]">
            {/* Card header names the page; the active folder is already the
                highlighted tab below, and the inbox tab carries the unread count. */}
            <div class="flex items-center gap-2 border-b border-border-hairline bg-surface-base px-4 py-3">
              <h1 class="text-sm font-semibold text-text-strong">{t("nav.messages")}</h1>
            </div>
            {/* Folder toolbar — the app shell already owns the global sidebar. */}
            <aside class="flex flex-wrap items-center justify-between gap-2 border-b border-border-hairline bg-surface-overlay px-3 py-2.5">
              {/* On a phone the four folders share one full-width row as
                  icon-over-label cells, so none of them hides off screen; from
                  sm up they sit inline beside the new-message button. */}
              <nav aria-label={t("messages.folders")} class="grid w-full grid-cols-4 gap-0.5 sm:flex sm:gap-1 sm:w-auto sm:min-w-0 sm:flex-1 sm:items-center">
                <For each={folders}>
                  {(entry) => {
                    const active = () => folder() === entry.id;
                    const Icon = entry.icon;
                    const badge = () => (entry.id === "inbox" ? unreadCount() ?? 0 : 0);
                    return (
                      <button
                        type="button"
                        aria-current={active() ? "page" : undefined}
                        class={cn(
                          "relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-0 py-1.5 text-[11px] font-semibold tracking-tight transition-colors sm:h-8 sm:tracking-normal sm:shrink-0 sm:flex-row sm:gap-2 sm:px-3 sm:py-0 sm:text-xs",
                          active()
                            ? entry.id === "trash"
                              ? "bg-destructive/10 text-destructive-text"
                              : "bg-primary/10 text-primary-text"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                        )}
                        onClick={() =>
                          startTransition(() => {
                            setFolder(entry.id);
                            setPage(1);
                            setSelectedId("");
                          })
                        }
                      >
                        <span class="relative flex items-center">
                          <Icon class="h-4 w-4" />
                          {/* Phone: the count rides on the icon. */}
                          <Show when={badge() > 0}>
                            <span class="absolute -right-2.5 -top-1.5 rounded-full bg-primary px-1 text-[11px] font-bold leading-4 text-primary-foreground sm:hidden">
                              {badge() > 99 ? "99+" : badge()}
                            </span>
                          </Show>
                        </span>
                        <span class="max-w-full truncate">{t(entry.labelKey)}</span>
                        <Show when={badge() > 0}>
                          <span class="hidden rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground sm:inline">
                            {badge()}
                          </span>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </nav>
              <Button
                size="sm"
                class="w-full shrink-0 rounded-lg sm:w-auto"
                onClick={() => setComposeOpen(true)}
              >
                <IconPlus class="h-4 w-4" />
                <span>{t("messages.newMessage")}</span>
              </Button>
            </aside>

            {/* Gmail Main Content Area */}
            <main class="flex-1 flex flex-col min-w-0 bg-background">
              {/* Top Header Toolbar */}
              <Show when={!selected()}>
                <div class="flex flex-col gap-2 border-b border-border-hairline bg-surface-overlay px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                  <div class="flex w-full items-center gap-2 sm:max-w-xl">
                    {/* Gmail Refresh Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-8 px-3 rounded-lg text-[13px] font-semibold shrink-0"
                      onClick={handleRefresh}
                      disabled={isRefreshing()}
                      title={t("messages.refreshList")}
                    >
                      <IconRefresh
                        class={cn(
                          "h-3.5 w-3.5 mr-1.5 transition-transform duration-500",
                          isRefreshing() && "animate-spin text-primary-text"
                        )}
                      />
                      {t("common.refresh")}
                    </Button>

                    <DataTableSearch
                      class="max-w-none"
                      placeholder={t("messages.search")}
                      value={query()}
                      onChange={(value) => {
                        setQuery(value);
                        // The server filters from the first row; offset restarts with each search.
                        setPage(1);
                      }}
                    />
                  </div>

                  <div class="flex items-center justify-end gap-3">
                    <Show when={folder() === "trash" && messages().length > 0}>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 rounded-lg text-[13px] text-destructive-text hover:bg-destructive/10"
                        onClick={() => setConfirmEmptyTrash(true)}
                      >
                        <IconTrash class="mr-1.5 h-3.5 w-3.5" />
                        {t("messages.emptyTrash")}
                      </Button>
                    </Show>

                    <Show when={messagePage()}>
                      <span class="font-mono text-xs text-text-subtle shrink-0">
                        {messagePage()!.total > 0
                          ? `${(page() - 1) * limit + 1}-${Math.min(page() * limit, messagePage()!.total)} / ${messagePage()!.total}`
                          : "0 / 0"}
                      </span>
                    </Show>
                  </div>
                </div>
              </Show>

              {/* Gmail Content View: List or Detail */}
              <div class="flex-1 overflow-auto">
                <Show
                  when={selected()}
                  fallback={
                    /* Gmail Dense List View */
                    <div
                      class={cn(
                        "transition-opacity duration-200",
                        isPending() && "opacity-50 pointer-events-none"
                      )}
                    >
                      <Suspense
                        fallback={
                          <div class="p-6 text-center text-xs text-muted-foreground">
                            {t("common.loading")}
                          </div>
                        }
                      >
                        <Show
                          when={messages().length > 0}
                          fallback={
                            <div class="p-12 text-center text-xs text-muted-foreground">
                              {query().trim() ? t("common.noResults") : t("messages.noMessages")}
                            </div>
                          }
                        >
                          <For each={messages()}>
                            {(message) => (
                              <GmailMailRow
                                message={message}
                                currentUserId={auth.user()?.id}
                                folder={folder()}
                                isSelected={selectedId() === message.id}
                                onSelect={() => setSelectedId(message.id)}
                                onArchive={
                                  folder() === "archive"
                                    ? () => handleAction(message, { folder: restoreFolder(message) })
                                    : () => handleAction(message, { folder: "archive" })
                                }
                                onTrash={
                                  folder() === "trash"
                                    ? () => handleAction(message, { folder: restoreFolder(message) })
                                    : () => handleAction(message, { folder: "trash" })
                                }
                                onDeleteForever={
                                  folder() === "trash"
                                    ? () => handleAction(message, { delete: true })
                                    : undefined
                                }
                                onToggleRead={
                                  !isOwnSentMessage(message)
                                    ? () => handleAction(message, { read: !message.read })
                                    : undefined
                                }
                              />
                            )}
                          </For>
                        </Show>
                      </Suspense>

                      <Show when={messagePage() && messagePage()!.total > limit}>
                        <div class="p-4 border-t border-border-hairline">
                          <TablePagination
                            pageIndex={page()}
                            onPageChange={setPage}
                            pageCount={Math.ceil((messagePage()?.total ?? 0) / limit)}
                          />
                        </div>
                      </Show>
                    </div>
                  }
                >
                  {/* Gmail Mail Detail View with Inline Gmail Reply Editor */}
                  {(message) => (
                    <GmailMailDetail
                      message={message()}
                      currentUserId={auth.user()?.id}
                      folder={folder()}
                      onBack={() => setSelectedId("")}
                      onAction={(action) => handleAction(message(), action)}
                      onSuccess={() => {
                        refetch();
                        if (folder() === "inbox") refetchUnread();
                      }}
                      setFlash={setFlash}
                    />
                  )}
                </Show>
              </div>
            </main>
          </div>
        </section>
        </div>

        {/* Gmail Floating Compose Box at Bottom Right */}
        <GmailComposeBox
          open={composeOpen()}
          onClose={() => {
            setComposeOpen(false);
          }}
          onSuccess={() => {
            if (folder() === "sent") refetch();
            setFlash(t("messages.sentToast"));
          }}
        />
      </div>
      <ConfirmDialog
        open={confirmEmptyTrash()}
        onOpenChange={setConfirmEmptyTrash}
        title={t("messages.emptyTrash")}
        variant="destructive"
        summary={emptyTrashSummary()}
        confirmLabel={t("messages.emptyTrash")}
        onConfirm={handleEmptyTrash}
      />
    </RouteGuard>
  );
}
