import {
  For,
  Show,
  createMemo,
  createSignal,
  Suspense,
  useTransition,
} from "solid-js";
import { createResource } from "@/lib/create-resource";
import { RouteGuard } from "@/components/layout/route-guard";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  IconArchive,
  IconMessage,
  IconSearch,
  IconSend,
  IconTrash,
  IconPlus,
  IconRefresh,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
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
import { formatApiError } from "@/api/client";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { createFlash } from "@/lib/flash";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function MessagesPage() {
  const t = useT();
  const auth = useAuth();
  const [folder, setFolder] = createSignal<MessageFolder>("inbox");
  const [page, setPage] = createSignal(1);
  const limit = 30;
  const [selectedId, setSelectedId] = createSignal<string>("");
  const [query, setQuery] = createSignal("");
  const [composeOpen, setComposeOpen] = createSignal(false);
  const [isRefreshing, setIsRefreshing] = createSignal(false);
  const [replyData, setReplyData] = createSignal<{
    recipient: string;
    subject: string;
    body: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, setFlash] = createFlash();

  const [messagePage, { refetch }] = createResource(
    () => ({ f: folder(), p: page() }),
    async (args) => await getMessages(args.f, { limit, offset: (args.p - 1) * limit })
  );

  const [unreadCount, { refetch: refetchUnread }] = createResource(
    async () => (await getMessages("inbox", { read: false, limit: 1 })).total
  );

  const rawMessages = createMemo(() => messagePage()?.items ?? []);

  // En yeni mesaj en üstte sıralama
  const messages = createMemo(() =>
    rawMessages().slice().sort((a, b) => b.sent_at - a.sent_at)
  );

  const filtered = createMemo(() => {
    const q = query().trim();
    if (!q) return messages();
    return messages().filter((m) => {
      const isSent = folder() === "sent" || m.sender.id === auth.user()?.id;
      const peer = isSent ? m.recipient : m.sender;
      const other = personLabel(peer);
      return matchesSearch(q, other, m.subject, m.body, m.label);
    });
  });

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
      refetch();
    } catch (err: any) {
      console.error("Empty trash error:", err);
      setFlash(formatApiError(err));
    }
  };

  const folderLabel = () => {
    const f = folder();
    if (f === "sent") return t("messages.sent");
    if (f === "archive") return t("messages.archive");
    if (f === "trash") return t("messages.trash");
    return t("messages.inbox");
  };

  return (
    <RouteGuard>
      <div class="space-y-4">
        <div class="min-h-[50vh] sm:min-h-[calc(100vh-11rem)]">
        <section class="data-shell overflow-hidden p-0">
          <div class="flex min-h-[50vh] flex-col sm:min-h-[calc(100vh-11rem)]">
            {/* Card header — folder name + unread chip, matching Figma's "Gelen kutusu" card. */}
            <div class="flex items-center gap-2 border-b border-border-hairline bg-surface-base px-4 py-3">
              <p class="text-sm font-semibold text-text-strong">{folderLabel()}</p>
              <Show when={folder() === "inbox" && unreadCount() && unreadCount()! > 0}>
                <Badge variant="secondary" class="rounded-full text-[11px]">
                  {unreadCount()} {t("messages.unread")}
                </Badge>
              </Show>
            </div>
            {/* Folder toolbar — the app shell already owns the global sidebar. */}
            <aside class="flex flex-wrap items-center justify-between gap-2 border-b border-border-hairline bg-surface-overlay px-3 py-2.5">
              {/* Folder navigation stays compact, leaving the only sidebar to the app shell. */}
              <nav class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                <button
                  type="button"
                  class={cn(
                    "flex h-8 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                    folder() === "inbox"
                      ? "bg-primary/10 text-primary-text"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  onClick={() =>
                    startTransition(() => {
                      setFolder("inbox");
                      setPage(1);
                      setSelectedId("");
                    })
                  }
                >
                  <div class="flex items-center gap-3">
                    <IconMessage class="h-4 w-4" />
                    <span>{t("messages.inbox")}</span>
                  </div>
                  <Show when={unreadCount() ? unreadCount()! > 0 : false}>
                    <span class="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      {unreadCount()}
                    </span>
                  </Show>
                </button>

                <button
                  type="button"
                  class={cn(
                    "flex h-8 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                    folder() === "sent"
                      ? "bg-primary/10 text-primary-text"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  onClick={() =>
                    startTransition(() => {
                      setFolder("sent");
                      setPage(1);
                      setSelectedId("");
                    })
                  }
                >
                  <div class="flex items-center gap-3">
                    <IconSend class="h-4 w-4" />
                    <span>{t("messages.sent")}</span>
                  </div>
                </button>

                <button
                  type="button"
                  class={cn(
                    "flex h-8 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                    folder() === "archive"
                      ? "bg-primary/10 text-primary-text"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  onClick={() =>
                    startTransition(() => {
                      setFolder("archive");
                      setPage(1);
                      setSelectedId("");
                    })
                  }
                >
                  <div class="flex items-center gap-3">
                    <IconArchive class="h-4 w-4" />
                    <span>{t("messages.archive")}</span>
                  </div>
                </button>

                <button
                  type="button"
                  class={cn(
                    "flex h-8 shrink-0 items-center justify-between gap-2 rounded-lg px-3 text-xs font-semibold transition-colors",
                    folder() === "trash"
                      ? "bg-destructive/10 text-destructive-text"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                  onClick={() =>
                    startTransition(() => {
                      setFolder("trash");
                      setPage(1);
                      setSelectedId("");
                    })
                  }
                >
                  <div class="flex items-center gap-3">
                    <IconTrash class="h-4 w-4" />
                    <span>{t("messages.trash")}</span>
                  </div>
                </button>
              </nav>
              <Button
                size="sm"
                class="shrink-0 rounded-lg"
                onClick={() => {
                  setReplyData(null);
                  setComposeOpen(true);
                }}
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

                    <div class="relative w-full">
                      <IconSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
                      <Input
                        class="h-8 rounded-lg bg-surface-tint pl-9 pr-4 text-[13px] border-none focus-visible:ring-1"
                        placeholder={t("messages.search")}
                        value={query()}
                        onInput={(event) => setQuery(event.currentTarget.value)}
                      />
                    </div>
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
                          when={filtered().length > 0}
                          fallback={
                            <div class="p-12 text-center text-xs text-muted-foreground">
                              {t("messages.noMessages")}
                            </div>
                          }
                        >
                          <For each={filtered()}>
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
                          <PaginationControls
                            page={page()}
                            onPageChange={setPage}
                            totalPages={Math.ceil((messagePage()?.total ?? 0) / limit)}
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
            setReplyData(null);
          }}
          onSuccess={() => {
            if (folder() === "sent") refetch();
            setFlash(t("messages.sentToast"));
          }}
          initialRecipient={replyData()?.recipient}
          initialSubject={replyData()?.subject}
          initialBody={replyData()?.body}
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
