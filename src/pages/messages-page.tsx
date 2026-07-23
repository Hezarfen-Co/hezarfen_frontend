import {
  For,
  Show,
  createMemo,
  createResource,
  createSignal,
  Suspense,
  useTransition,
} from "solid-js";
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
import { personLabel } from "@/lib/person";
import { createFlash } from "@/lib/flash";

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
    const q = query().trim().toLocaleLowerCase();
    if (!q) return messages();
    return messages().filter((m) => {
      const isSent = folder() === "sent" || m.sender.id === auth.user()?.id;
      const peer = isSent ? m.recipient : m.sender;
      const other = personLabel(peer);
      return [other, m.subject, m.body, m.label || ""].join(" ").toLocaleLowerCase().includes(q);
    });
  });

  const selected = createMemo(() => messages().find((m) => m.id === selectedId()) ?? null);
  const isOwnSentMessage = (msg: Message) => msg.sender.id === auth.user()?.id;

  const restoreFolder = (msg: Message): MessageFolder => {
    if (msg.previous_folder && (msg.previous_folder as string) !== "deleted") {
      return msg.previous_folder as MessageFolder;
    }
    return isOwnSentMessage(msg) ? "sent" : "inbox";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetch(), refetchUnread()]);
      setFlash("Mesajlar güncellendi");
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
          setFlash("Kalıcı silme işlemi sadece Çöp Kutusu'ndaki mesajlar için geçerlidir");
          return;
        }
        await deleteMessageById(msg.id);
        setFlash(t("messages.deletedToast"));
      } else if (action.folder) {
        await patchMessageById(msg.id, { folder: action.folder });
        setFlash(t("messages.movedToast"));
      } else if (action.read !== undefined) {
        if (isOwnSentMessage(msg)) {
          setFlash("Sadece alınan mesajların okundu durumu değiştirilebilir");
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

  const handleEmptyTrash = async () => {
    const trashItems = messages();
    if (trashItems.length === 0) return;
    try {
      await Promise.all(trashItems.map((m) => deleteMessageById(m.id)));
      setFlash("Çöp kutusu boşaltıldı");
      setSelectedId("");
      refetch();
    } catch (err: any) {
      console.error("Empty trash error:", err);
      setFlash(formatApiError(err));
    }
  };

  return (
    <RouteGuard>
      <div class="min-h-[calc(100vh-7rem)] bg-background">
        <section class="data-shell overflow-hidden p-0 border-none">
          <div class="flex flex-col md:flex-row min-h-[calc(100vh-7rem)]">
            {/* Gmail Left Sidebar */}
            <aside class="w-full md:w-60 border-r bg-card/60 p-4 shrink-0 space-y-6">
              {/* Gmail Compose Button */}
              <button
                type="button"
                class="flex h-12 px-6 items-center gap-3 rounded-2xl bg-card border border-border/80 shadow-md hover:shadow-lg hover:bg-accent text-foreground font-bold text-xs tracking-tight transition-all duration-200"
                onClick={() => {
                  setReplyData(null);
                  setComposeOpen(true);
                }}
              >
                <IconPlus class="h-5 w-5 text-primary" />
                <span>{t("messages.newMessage")}</span>
              </button>

              {/* Gmail Folder Navigation List */}
              <nav class="space-y-1">
                <button
                  type="button"
                  class={cn(
                    "flex h-9 w-full items-center justify-between rounded-r-full px-4 text-xs font-semibold transition-colors",
                    folder() === "inbox"
                      ? "bg-primary/10 text-primary font-bold"
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
                    <span class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {unreadCount()}
                    </span>
                  </Show>
                </button>

                <button
                  type="button"
                  class={cn(
                    "flex h-9 w-full items-center justify-between rounded-r-full px-4 text-xs font-semibold transition-colors",
                    folder() === "sent"
                      ? "bg-primary/10 text-primary font-bold"
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
                    "flex h-9 w-full items-center justify-between rounded-r-full px-4 text-xs font-semibold transition-colors",
                    folder() === "archive"
                      ? "bg-primary/10 text-primary font-bold"
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
                    "flex h-9 w-full items-center justify-between rounded-r-full px-4 text-xs font-semibold transition-colors",
                    folder() === "trash"
                      ? "bg-destructive/10 text-destructive font-bold"
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
            </aside>

            {/* Gmail Main Content Area */}
            <main class="flex-1 flex flex-col min-w-0 bg-background">
              {/* Top Header Toolbar */}
              <Show when={!selected()}>
                <div class="flex items-center justify-between border-b px-4 py-3 bg-card/40">
                  <div class="flex items-center gap-2 w-full max-w-xl">
                    {/* Gmail Refresh Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      class="h-9 px-3 rounded-full text-xs font-semibold shrink-0"
                      onClick={handleRefresh}
                      disabled={isRefreshing()}
                      title="Mesajları Yenile"
                    >
                      <IconRefresh
                        class={cn(
                          "h-3.5 w-3.5 mr-1.5 transition-transform duration-500",
                          isRefreshing() && "animate-spin text-primary"
                        )}
                      />
                      Yenile
                    </Button>

                    <div class="relative w-full">
                      <IconSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        class="h-9 rounded-full bg-muted/40 pl-9 pr-4 text-xs border-none focus-visible:ring-1"
                        placeholder={t("messages.search")}
                        value={query()}
                        onInput={(event) => setQuery(event.currentTarget.value)}
                      />
                    </div>
                  </div>

                  <div class="flex items-center gap-3">
                    <Show when={folder() === "trash" && messages().length > 0}>
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                        onClick={handleEmptyTrash}
                      >
                        <IconTrash class="mr-1.5 h-3.5 w-3.5" />
                        Çöp Kutusunu Boşalt
                      </Button>
                    </Show>

                    <Show when={messagePage()}>
                      <span class="font-mono text-xs text-muted-foreground shrink-0">
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
                        <div class="p-4 border-t">
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
    </RouteGuard>
  );
}
