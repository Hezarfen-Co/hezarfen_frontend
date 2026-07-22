import { For, Show, createMemo, createResource, createSignal, Suspense, createEffect, useTransition } from "solid-js";
import { RouteGuard } from "@/components/layout/route-guard";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconArchive, IconMessage, IconSearch, IconSend, IconTrash, IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { cn } from "@/lib/cn";
import { getMessages } from "@/api/messages";
import { patchMessageById } from "@/api/messages";
import { postMessage } from "@/api/messages";
import { deleteMessageById } from "@/api/messages";
import type { Message, MessageFolder } from "@/api/client";
import { formatApiError } from "@/api/client";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { personLabel } from "@/lib/person";
import { createFlash } from "@/lib/flash";

export default function MessagesPage() {
  const t = useT();
  const auth = useAuth();
  const [sidebarWidth, setSidebarWidth] = createSignal(208);
  const [listWidth, setListWidth] = createSignal(448);
  const [folder, setFolder] = createSignal<MessageFolder>("inbox");
  const [page, setPage] = createSignal(1);
  const limit = 30;
  const [selectedId, setSelectedId] = createSignal<string>("");
  const [query, setQuery] = createSignal("");
  const [composeOpen, setComposeOpen] = createSignal(false);
  const [replyData, setReplyData] = createSignal<{ recipient: string; subject: string; body: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [, setFlash] = createFlash();

  const [messagePage, { refetch }] = createResource(
    () => ({ f: folder(), p: page() }),
    async (args) => await getMessages(args.f, { limit, offset: (args.p - 1) * limit }),
  );
  
  const [unreadCount, { refetch: refetchUnread }] = createResource(
    async () => (await getMessages("inbox", { read: false, limit: 1 })).total
  );

  const messages = createMemo(() => messagePage()?.items ?? []);
  
  const filtered = createMemo(() => {
    const q = query().trim().toLocaleLowerCase();
    if (!q) return messages();
    return messages().filter((m) => {
      const other = folder() === "sent" ? personLabel(m.recipient) : personLabel(m.sender);
      return [other, m.subject, m.body, m.label].join(" ").toLocaleLowerCase().includes(q);
    });
  });

  const selected = createMemo(() => messages().find((m) => m.id === selectedId()) ?? null);
  const isOwnSentMessage = (msg: Message) => msg.sender.id === auth.user()?.id;
  const restoreFolder = (msg: Message): MessageFolder => isOwnSentMessage(msg) ? "sent" : "inbox";
  const gridTemplate = () => `${sidebarWidth()}px 0.375rem ${listWidth()}px 0.375rem minmax(0,1fr)`;

  const startResize = (target: "sidebar" | "list", event: PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startSidebar = sidebarWidth();
    const startList = listWidth();
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const move = (next: PointerEvent) => {
      const delta = next.clientX - startX;
      if (target === "sidebar") setSidebarWidth(clamp(startSidebar + delta, 176, 320));
      else setListWidth(clamp(startList + delta, 320, 640));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Mark as read when selected
  createEffect(() => {
    const msg = selected();
    if (msg && !msg.read && msg.folder === "inbox") {
      patchMessageById(msg.id, { read: true })
        .then(() => {
          refetch();
          refetchUnread();
        })
        .catch(console.error);
    }
  });

  const handleAction = async (msg: Message, action: { folder?: MessageFolder, delete?: boolean }) => {
    try {
      if (action.delete) {
        await deleteMessageById(msg.id);
      } else if (action.folder) {
        await patchMessageById(msg.id, { folder: action.folder });
      }
      if (selectedId() === msg.id) setSelectedId("");
      await refetch();
      if (action.folder === "inbox" || msg.folder === "inbox") await refetchUnread();
      setFlash(action.delete ? t("messages.deletedToast") : t("messages.movedToast"));
    } catch (err) {
      console.error(err);
    }
  };

  const timeLabel = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <RouteGuard>
      <div>
        <section class="data-shell overflow-hidden p-0">
          <div class="grid min-h-[calc(100vh-7rem)] lg:[grid-template-columns:var(--messages-cols)]" style={{ "--messages-cols": gridTemplate() }}>
            <aside class="border-b border-border/80 bg-card/60 p-3 lg:border-b-0">
              <div class="space-y-3">
                <Button class="w-full rounded-xl shadow-sm" onClick={() => { setSelectedId(""); setComposeOpen(true); }}>
                  <IconPlus class="h-4 w-4" />
                  {t("messages.newMessage")}
                </Button>
                <div class="space-y-1">
                  <Button 
                    variant={folder() === "inbox" ? "secondary" : "ghost"} 
                    class={cn("h-11 w-full justify-start rounded-xl", folder() !== "inbox" && "text-muted-foreground", folder() === "inbox" && "border border-violet-500/50 bg-card text-foreground ring-1 ring-violet-500/30")}
                    onClick={() => startTransition(() => { setFolder("inbox"); setPage(1); setSelectedId(""); })}
                  >
                    <IconMessage class="h-4 w-4" />
                    {t("messages.inbox")}
                    <Show when={unreadCount() ? unreadCount()! > 0 : false}>
                      <Badge variant="default" class="ml-auto h-5 min-w-5 justify-center rounded-full px-1 text-[10px]">{unreadCount()}</Badge>
                    </Show>
                  </Button>
                  <Button 
                    variant={folder() === "sent" ? "secondary" : "ghost"} 
                    class={cn("h-11 w-full justify-start rounded-xl", folder() !== "sent" && "text-muted-foreground", folder() === "sent" && "border border-violet-500/50 bg-card text-foreground ring-1 ring-violet-500/30")}
                    onClick={() => startTransition(() => { setFolder("sent"); setPage(1); setSelectedId(""); })}
                  >
                    <IconSend class="h-4 w-4" />
                    {t("messages.sent")}
                  </Button>
                  <Button 
                    variant={folder() === "archive" ? "secondary" : "ghost"} 
                    class={cn("h-11 w-full justify-start rounded-xl", folder() !== "archive" && "text-muted-foreground", folder() === "archive" && "border border-violet-500/50 bg-card text-foreground ring-1 ring-violet-500/30")}
                    onClick={() => startTransition(() => { setFolder("archive"); setPage(1); setSelectedId(""); })}
                  >
                    <IconArchive class="h-4 w-4" />
                    {t("messages.archive")}
                  </Button>
                  <Button 
                    variant={folder() === "trash" ? "secondary" : "ghost"} 
                    class={cn("h-11 w-full justify-start rounded-xl", folder() !== "trash" && "text-muted-foreground", folder() === "trash" && "border border-rose-500/50 bg-card text-foreground ring-1 ring-rose-500/30")}
                    onClick={() => startTransition(() => { setFolder("trash"); setPage(1); setSelectedId(""); })}
                  >
                    <IconTrash class="h-4 w-4" />
                    {t("messages.trash")}
                  </Button>
                </div>
              </div>
            </aside>

            <div
              role="separator"
              aria-orientation="vertical"
              class="hidden cursor-col-resize bg-border/60 transition-colors hover:bg-primary/50 lg:block"
              onPointerDown={(event) => startResize("sidebar", event)}
            />

            <div class="flex min-w-0 flex-col border-b lg:border-b-0">
              <div class="border-b p-3">
                <div class="relative">
                  <IconSearch class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input class="h-11 rounded-xl pl-8" placeholder={t("messages.search")} value={query()} onInput={(event) => setQuery(event.currentTarget.value)} />
                </div>
              </div>
              <div class={cn("flex-1 space-y-2 overflow-auto p-3 transition-opacity", isPending() && "opacity-50 pointer-events-none")}>
                <Suspense fallback={<div class="p-4 text-center text-sm text-muted-foreground">{t("common.loading")}</div>}>
                  <Show when={filtered().length > 0} fallback={<div class="p-4 text-center text-sm text-muted-foreground">{t("messages.noMessages")}</div>}>
                    <For each={filtered()}>
                      {(message) => {
                        const isSent = folder() === "sent" || isOwnSentMessage(message);
                        const peerName = isSent ? personLabel(message.recipient) : personLabel(message.sender);
                        const role = isSent ? message.recipient_role : message.sender_role;
                        const unread = !isSent && !message.read;
                        
                        return (
                          <button
                            type="button"
                            class={cn(
                              "w-full rounded-2xl border bg-card p-3 text-left shadow-sm transition-all duration-200",
                              selected()?.id === message.id ? "border-violet-500/60 ring-1 ring-violet-500/30 bg-card shadow-md" : "border-border/80 hover:border-violet-500/40 hover:bg-muted/30",
                              unread && selected()?.id !== message.id && "border-violet-500/30 bg-muted/20"
                            )}
                            onClick={() => { setComposeOpen(false); setSelectedId(message.id); }}
                          >
                            <div class="flex items-start justify-between gap-2">
                              <span class={cn("truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground")}>{peerName}</span>
                              <span class={cn("mono shrink-0 text-[10px]", unread ? "font-medium text-foreground" : "text-muted-foreground")}>{timeLabel(message.sent_at)}</span>
                            </div>
                            <div class="mt-1 flex items-center gap-2">
                              <Show when={unread}>
                                <span class="h-2 w-2 shrink-0 rounded-full bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.2)]" />
                              </Show>
                              <span class={cn("truncate text-sm", unread ? "font-bold text-foreground" : "font-medium text-foreground/90")}>{message.subject}</span>
                            </div>
                            <p class={cn("mt-1.5 line-clamp-3 text-xs leading-relaxed", unread ? "text-foreground/80" : "text-muted-foreground")}>{message.body}</p>
                            <Show when={message.label || role}>
                              <div class="mt-3 flex items-center gap-2">
                                <Show when={message.label}>
                                  <Badge variant={unread ? "default" : "secondary"} class="text-[10px]">{message.label}</Badge>
                                </Show>
                                <Show when={role}>
                                  <span class="text-[10px] uppercase tracking-widest text-muted-foreground">{t(`role.${role}` as any)}</span>
                                </Show>
                              </div>
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </Show>
                </Suspense>
              </div>
              <Show when={messagePage() && messagePage()!.total > limit}>
                <div class="border-t p-3">
                  <PaginationControls
                    page={page()}
                    onPageChange={setPage}
                    totalPages={Math.ceil((messagePage()?.total ?? 0) / limit)}
                  />
                </div>
              </Show>
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              class="hidden cursor-col-resize bg-border/60 transition-colors hover:bg-primary/50 lg:block"
              onPointerDown={(event) => startResize("list", event)}
            />

            <Show
              when={!composeOpen()}
              fallback={
                <div class="h-full overflow-auto p-5">
                  <ComposePanel
                    open={composeOpen()}
                    onOpenChange={(open) => {
                      if (!open) setReplyData(null);
                      setComposeOpen(open);
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
              }
            >
            <Show when={selected()} fallback={<div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground"><span class="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/50 ring-1 ring-violet-500/30 bg-muted/40 text-foreground"><IconMessage class="h-7 w-7" /></span><p>{t("messages.noSelection")}</p><Button type="button" size="sm" class="rounded-xl" onClick={() => setComposeOpen(true)}><IconPlus class="h-4 w-4" />{t("messages.newMessage")}</Button></div>}>
              {(message) => {
                const isSent = folder() === "sent" || isOwnSentMessage(message());
                const peerName = isSent ? personLabel(message().recipient) : personLabel(message().sender);
                const role = isSent ? message().recipient_role : message().sender_role;
                
                return (
                  <article class="flex h-full flex-col">
                    <div class="flex flex-wrap items-center gap-2 border-b bg-muted/20 p-3">
                      <Show when={!isSent}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                            class="rounded-xl"
                          onClick={() => {
                            setReplyData({
                              recipient: message().sender.id,
                              subject: message().subject.startsWith("Re:") ? message().subject : `Re: ${message().subject}`,
                              body: `\n\n--- Önceki Mesaj ---\n${message().body}`,
                            });
                            setSelectedId("");
                            setComposeOpen(true);
                          }}
                        >
                          <IconMessage class="mr-2 h-4 w-4" />
                          {t("messages.reply")}
                        </Button>
                        <div class="mx-1 h-4 w-[1px] bg-border" />
                      </Show>
                      <Show when={folder() !== "archive"}>
                        <Button variant="ghost" size="sm" class="h-10 rounded-xl" onClick={() => handleAction(message(), { folder: "archive" })} title={t("messages.moveToArchive")}>
                          <IconArchive class="h-4 w-4" />
                          {t("messages.moveToArchive")}
                        </Button>
                      </Show>
                      <Show when={folder() === "archive"}>
                        <Button variant="ghost" size="sm" class="h-10 rounded-xl" onClick={() => handleAction(message(), { folder: restoreFolder(message()) })} title={t("messages.moveOutOfArchive")}>
                          <IconMessage class="mr-2 h-4 w-4" />
                          {t("messages.moveOutOfArchive")}
                        </Button>
                      </Show>
                      <Show when={folder() !== "trash"}>
                        <Button variant="ghost" size="sm" class="h-10 rounded-xl text-destructive" onClick={() => handleAction(message(), { folder: "trash" })} title={t("messages.moveToTrash")}>
                          <IconTrash class="h-4 w-4" />
                          {t("messages.moveToTrash")}
                        </Button>
                      </Show>
                      <Show when={folder() === "trash"}>
                        <Button variant="ghost" size="sm" class="h-10 rounded-xl text-destructive" onClick={() => handleAction(message(), { delete: true })} title={t("messages.deleteForever")}>
                          <IconTrash class="h-4 w-4" />
                          {t("messages.deleteForever")}
                        </Button>
                      </Show>
                    </div>
                    <div class="border-b p-5">
                      <div class="flex items-start gap-4">
                        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/50 ring-1 ring-violet-500/30 bg-muted/40 text-lg font-bold uppercase text-foreground">
                          {peerName.charAt(0)}
                        </div>
                        <div class="min-w-0 flex-1">
                          <h2 class="font-display text-2xl font-semibold tracking-tight">{message().subject}</h2>
                          <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{isSent ? t("messages.to") : t("messages.from")}</span>
                            <span class="font-medium text-foreground">{peerName}</span>
                            <Show when={role}>
                              <Badge variant="outline" class="ml-1 px-1.5 py-0 text-[10px] uppercase tracking-wider">{t(`role.${role}` as any)}</Badge>
                            </Show>
                          </div>
                        </div>
                        <span class="mono shrink-0 rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-xs text-muted-foreground">{timeLabel(message().sent_at)}</span>
                      </div>
                    </div>
                    <div class="flex-1 overflow-auto p-5">
                      <div class="rounded-xl border bg-card p-5 text-sm leading-7 text-foreground/90 shadow-sm">
                        <p class="whitespace-pre-wrap">{message().body}</p>
                      </div>
                    </div>
                  </article>
                );
              }}
            </Show>
            </Show>
          </div>
        </section>
      </div>
    </RouteGuard>
  );
}

function ComposePanel(props: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSuccess: () => void;
  initialRecipient?: string;
  initialSubject?: string;
  initialBody?: string;
}) {
  const t = useT();
  const auth = useAuth();
  const [recipient, setRecipient] = createSignal("");
  const [subject, setSubject] = createSignal("");
  const [body, setBody] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");

  createEffect(() => {
    if (props.open) {
      setRecipient(props.initialRecipient ?? "");
      setSubject(props.initialSubject ?? "");
      setBody(props.initialBody ?? "");
    }
  });

  const reset = () => {
    setRecipient("");
    setSubject("");
    setBody("");
    setError("");
  };

  const handleSend = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!recipient()) {
      setError(t("messages.selectRecipient"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await postMessage({
        recipient_id: recipient(),
        subject: subject().trim(),
        body: body().trim() || undefined,
      });
      props.onSuccess();
      props.onOpenChange(false);
      reset();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="mx-auto max-w-3xl rounded-xl border bg-card p-5 shadow-sm">
      <form class="space-y-5" onSubmit={handleSend}>
        <div class="space-y-1">
          <h2 class="font-display text-2xl font-semibold tracking-tight">{t("messages.newMessage")}</h2>
          <p class="text-sm text-muted-foreground">{t("nav.messages")}</p>
        </div>
        <div class="space-y-1.5 rounded-2xl border border-border/80 bg-card p-4 dark:border-white/[0.08]">
          <Label for="msg-recipient">{t("messages.recipient")}</Label>
          <UserSearchSelect
            id="msg-recipient"
            value={recipient()}
            onChange={setRecipient}
            placeholder={t("messages.recipientPlaceholder")}
            excludeIds={auth.user()?.id ? [auth.user()!.id] : []}
          />
        </div>
        <div class="space-y-1.5 rounded-2xl border border-border/80 bg-card p-4 dark:border-white/[0.08]">
          <Label for="msg-subject">{t("form.title")}</Label>
          <Input 
            id="msg-subject" 
            required 
            maxlength={200}
            value={subject()}
            onInput={(e) => setSubject(e.currentTarget.value)} 
          />
        </div>
        <div class="space-y-1.5 rounded-2xl border border-border/80 bg-card p-4 dark:border-white/[0.08]">
          <Label for="msg-body">{t("form.description")}</Label>
          <Textarea 
            id="msg-body" 
            rows={12}
            class="min-h-[18rem] resize-y"
            value={body()}
            onInput={(e) => setBody(e.currentTarget.value)}
          />
        </div>
        {error() && <p class="text-sm text-destructive">{error()}</p>}
        <div class="flex flex-wrap gap-2">
          <Button type="submit" class="rounded-xl" disabled={pending()}>
            <IconSend class="mr-2 h-4 w-4" />
            {t("messages.send")}
          </Button>
          <Button type="button" variant="outline" class="rounded-xl" onClick={() => props.onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
