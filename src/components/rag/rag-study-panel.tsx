import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js";
import { useNavigate, useParams } from "@tanstack/solid-router";
import { formatApiError } from "@/api/client";
import type { RagMessage, RagThread } from "@/api/client";
import {
  deleteRagThreadById,
  getRagMessageById,
  getRagThreadMessages,
  patchRagThreadById,
  postRagMessage,
  postRagThread,
  ragStreamUrl,
} from "@/api/rag";
import { RagComposer } from "@/components/rag/rag-composer";
import { ragCopy } from "@/components/rag/rag-copy";
import { RagMessageRow } from "@/components/rag/rag-message-row";
import { RagStudyActions } from "@/components/rag/rag-study-actions";
import { RagStudyWelcome } from "@/components/rag/rag-study-welcome";
import { RagThreadList } from "@/components/rag/rag-thread-list";
import { Alert } from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IconChevronDown, IconEdit, IconMenu, IconPanelLeft, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { scopeFromCitations } from "@/lib/rag-study-scope";
import { useAuth } from "@/stores/auth-context";
import { usePreferences } from "@/stores/preferences-context";
import { suppressQuickActions } from "@/stores/quick-actions";

const POLL_INTERVAL_MS = 2000;
const COLLAPSED_KEY = "hezarfen.study.historyCollapsed";

/**
 * The AI hub's Study tab: chat over the course material the account may
 * read (`/rag/*`), every answer with its sources, and under each sourced
 * answer a way to summarize or practise exactly that range. Çelebi keeps its
 * own general chat on `/chatbot`; this is the grounded one.
 */
export function RagStudyPanel() {
  // The page is a docked composer; the phone quick-action button would sit
  // on its send button.
  suppressQuickActions();
  const { locale } = usePreferences();
  const copy = () => ragCopy(locale());
  const [threadId, setThreadId] = createSignal<string | undefined>();
  const [activeThread, setActiveThread] = createSignal<RagThread>();
  const [threadsVersion, setThreadsVersion] = createSignal(0);
  const [messages, setMessages] = createSignal<RagMessage[]>([]);
  const [draft, setDraft] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal("");
  const [studyUnavailable, setStudyUnavailable] = createSignal(false);
  const [renaming, setRenaming] = createSignal<RagThread | null>(null);
  const [removing, setRemoving] = createSignal<RagThread | null>(null);
  // Below lg the history is a drawer from the left edge, the way a chat app
  // on a phone keeps its conversations one tap away without spending the
  // screen on them. From lg it is the fixed column beside the transcript.
  const [historyOpen, setHistoryOpen] = createSignal(false);
  // From lg the history is a sidebar the reader can fold away, remembered on
  // this device the way a chat app remembers its sidebar.
  const [historyCollapsed, setHistoryCollapsed] = createSignal(
    typeof localStorage !== "undefined" && localStorage.getItem(COLLAPSED_KEY) === "1",
  );
  createEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem(COLLAPSED_KEY, historyCollapsed() ? "1" : "0");
  });
  const auth = useAuth();
  // A chat lives at /ai/study/$threadId, the way Vibe opens one at
  // /chat/<id>. This panel is the persistent parent of that route, so moving
  // between chats never remounts the sidebar or cuts a streaming answer.
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const routeThreadId = () => (params() as { threadId?: string }).threadId;
  // The API has no single-thread read; titles come from the sidebar's list.
  const [knownThreads, setKnownThreads] = createSignal<RagThread[]>([]);
  const greeting = () => {
    const hour = new Date().getHours();
    const base = hour < 12 ? copy().greetingMorning : hour < 18 ? copy().greetingAfternoon : copy().greetingEvening;
    const user = auth.user();
    const name = user?.display_name?.trim() || user?.name?.trim();
    return name ? `${base}, ${name}` : base;
  };
  createEffect(() => {
    if (!historyOpen()) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  let pollTimer: number | undefined;
  let stream: EventSource | undefined;
  const stopPolling = () => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    pollTimer = undefined;
  };
  const stopStream = () => {
    stream?.close();
    stream = undefined;
  };
  onCleanup(() => {
    stopPolling();
    stopStream();
  });

  const updateMessage = (message: RagMessage) => {
    setMessages((items) => items.map((item) => (item.id === message.id ? message : item)));
    if (message.status !== "pending") stopPolling();
  };
  const poll = (activeThread: string, messageId: string) => {
    stopPolling();
    const read = async () => {
      try {
        updateMessage(await getRagMessageById(activeThread, messageId));
      } catch {
        // A transient poll failure does not turn an accepted turn into an error.
      }
    };
    void read();
    pollTimer = window.setInterval(() => void read(), POLL_INTERVAL_MS);
  };
  // `done` carries the whole settled turn, citations included, so a late
  // reader gets the sources too; any stream trouble falls back to polling.
  const streamAnswer = (activeThread: string, messageId: string) => {
    stopStream();
    const source = new EventSource(ragStreamUrl(activeThread, messageId), { withCredentials: true });
    stream = source;
    source.addEventListener("delta", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as { text?: unknown };
        if (typeof data.text === "string") {
          const text = data.text;
          setMessages((items) => items.map((item) => (item.id === messageId ? { ...item, content: item.content + text } : item)));
        }
      } catch {
        // A malformed chunk is skipped; `done` settles the turn anyway.
      }
    });
    source.addEventListener("done", (event) => {
      try {
        updateMessage((JSON.parse((event as MessageEvent).data) as { message: RagMessage }).message);
      } catch {
        poll(activeThread, messageId);
      } finally {
        stopStream();
        setThreadsVersion((version) => version + 1);
      }
    });
    source.onerror = () => {
      stopStream();
      poll(activeThread, messageId);
    };
  };

  const loadThread = async (id: string) => {
    stopPolling();
    stopStream();
    setError("");
    setThreadId(id);
    setActiveThread(knownThreads().find((thread) => thread.id === id));
    setMessages([]);
    try {
      const page = await getRagThreadMessages(id, { limit: 500 });
      if (threadId() === id) setMessages(page.items);
    } catch (err) {
      if (threadId() === id) setError(formatApiError(err));
    }
  };
  const resetThread = () => {
    stopPolling();
    stopStream();
    setError("");
    setThreadId(undefined);
    setActiveThread(undefined);
    setMessages([]);
  };
  // The URL is the source of truth for which chat is open. A chat this panel
  // just created is already open when its URL lands, so it is not reloaded.
  createEffect(
    on(routeThreadId, (id) => {
      if (id === threadId()) return;
      if (id) void loadThread(id);
      else resetThread();
    }),
  );
  createEffect(() => {
    const id = threadId();
    if (!id || activeThread()?.id === id) return;
    const known = knownThreads().find((thread) => thread.id === id);
    if (known) setActiveThread(known);
  });
  const openThread = (thread: RagThread) => {
    setActiveThread(thread);
    void navigate({ to: "/ai/study/$threadId", params: { threadId: thread.id } });
  };
  const newThread = () => {
    void navigate({ to: "/ai/study" });
  };

  const send = async () => {
    const content = draft().trim();
    if (!content || sending()) return;
    setSending(true);
    setError("");
    setDraft("");
    const now = Date.now();
    setMessages((items) => [
      ...items,
      { id: `local-${now}`, thread_id: threadId() ?? "", role: "user", status: "complete", content, abstained: false, reason: "", citations: [], created_at: now },
    ]);
    try {
      const currentThread = threadId();
      const createdThread = currentThread ? undefined : await postRagThread();
      const resolvedThreadId = currentThread ?? createdThread!.id;
      if (createdThread) setActiveThread(createdThread);
      setThreadId(resolvedThreadId);
      if (createdThread) void navigate({ to: "/ai/study/$threadId", params: { threadId: resolvedThreadId }, replace: true });
      const accepted = await postRagMessage(resolvedThreadId, content);
      setMessages((items) => [
        ...items,
        { id: accepted.message_id, thread_id: resolvedThreadId, role: "assistant", status: "pending", content: "", abstained: false, reason: "", citations: [], created_at: Date.now() },
      ]);
      streamAnswer(resolvedThreadId, accepted.message_id);
      setThreadsVersion((version) => version + 1);
    } catch (err) {
      setError(formatApiError(err));
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  // The transcript follows the newest turn only while the reader is pinned to
  // the bottom. Any upward scroll unpins at once — a distance threshold alone
  // lost to a streamed answer that grows every frame and kept dragging the
  // reader back down. Content that lands while unpinned raises the pill below
  // instead of yanking the view.
  let scroller: HTMLDivElement | undefined;
  const NEAR_BOTTOM_PX = 64;
  const [pinned, setPinned] = createSignal(true);
  const [unread, setUnread] = createSignal(false);
  let lastScrollTop = 0;
  const scrollToLatest = () => {
    if (!scroller) return;
    setPinned(true);
    setUnread(false);
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
  };
  const handleTranscriptScroll = () => {
    if (!scroller) return;
    const top = scroller.scrollTop;
    const distance = scroller.scrollHeight - top - scroller.clientHeight;
    if (top < lastScrollTop - 1 && distance > 1) setPinned(false);
    else if (distance <= NEAR_BOTTOM_PX) {
      setPinned(true);
      setUnread(false);
    }
    lastScrollTop = top;
  };
  createEffect(
    on(
      () => {
        const items = messages();
        return `${items.length}:${items[items.length - 1]?.content.length ?? 0}`;
      },
      () => {
        const el = scroller;
        if (!el) return;
        if (!pinned()) { setUnread(true); return; }
        queueMicrotask(() => {
          el.scrollTop = el.scrollHeight;
          lastScrollTop = el.scrollTop;
        });
      },
      { defer: true },
    ),
  );

  /** Re-ask the question an answer replies to, through the same send pipeline. */
  const retry = (question: string) => {
    if (sending()) return;
    setDraft(question);
    void send();
  };

  /** The user turn an answer replies to, used as the study range's label. */
  const questionBefore = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) if (messages()[i]?.role === "user") return messages()[i]!.content;
    return undefined;
  };

  return (
    // Phones: one screen-tall column — top bar, transcript, composer — so the
    // composer sits above the tab bar instead of scrolling away with the page.
    // From lg the page fills the content column edge to edge, below the shell
    // header: a flush history sidebar and the conversation beside it.
    <div
      class={cn(
        "grid h-[calc(var(--app-viewport)-5.5rem-max(env(safe-area-inset-bottom),var(--android-nav-inset,0px)))] gap-4 max-lg:-mt-2",
        "lg:-mx-10 lg:-my-6 lg:h-[calc(100dvh-49px-env(safe-area-inset-top))] lg:gap-0",
        historyCollapsed() ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[260px_minmax(0,1fr)]",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        class={cn(
          "fixed inset-0 z-[55] bg-black/45 transition-opacity duration-300 lg:hidden",
          historyOpen() ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setHistoryOpen(false)}
      />
      <aside
        aria-label={copy().history}
        class={cn(
          "flex min-h-0 flex-col gap-3 bg-surface-base",
          // Phone drawer. `visibility` rides the transition so the panel
          // slides out before it leaves the tab order.
          "fixed inset-y-0 left-0 z-[60] w-[min(20rem,85vw)] border-r border-border-line px-3 pb-[calc(max(env(safe-area-inset-bottom),var(--android-nav-inset,0px))+0.75rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] shadow-xl transition-[transform,visibility] duration-300 ease-out",
          historyOpen() ? "visible translate-x-0" : "invisible -translate-x-full",
          "lg:visible lg:static lg:z-auto lg:h-full lg:w-auto lg:translate-x-0 lg:gap-2 lg:border-r lg:border-border-hairline lg:bg-surface-overlay/40 lg:px-2 lg:py-3 lg:shadow-none lg:transition-none",
          historyCollapsed() && "lg:hidden",
        )}
      >
        {/* Vibe's sidebar head: the page's name, then its fold-away control. */}
        <div class="flex h-10 items-center gap-1 pl-2.5 lg:h-9">
          <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-text-strong">{copy().title}</h2>
          <button
            type="button"
            class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
            aria-label={copy().collapseHistory}
            title={copy().collapseHistory}
            onClick={() => setHistoryCollapsed(true)}
          >
            <IconPanelLeft class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            aria-label={copy().closeHistory}
            onClick={() => setHistoryOpen(false)}
          >
            <IconX class="h-5 w-5" />
          </button>
        </div>
        {/* "New chat" is a nav row, filled while the new-chat screen is open. */}
        <button
          type="button"
          class={cn(
            "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-foreground outline-hidden transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:h-9",
            threadId() ? "hover:bg-muted/60" : "bg-muted font-medium",
          )}
          onClick={() => {
            setHistoryOpen(false);
            newThread();
          }}
        >
          <IconPlus class="h-4 w-4 shrink-0" />
          <span class="truncate">{copy().newThread}</span>
        </button>
        <h3 class="px-2.5 pb-0.5 pt-4 text-xs font-medium text-muted-foreground">{copy().recents}</h3>
        <RagThreadList
          activeId={threadId()}
          version={threadsVersion()}
          locale={locale()}
          labels={copy()}
          onThreads={setKnownThreads}
          onOpen={(thread) => {
            setHistoryOpen(false);
            openThread(thread);
          }}
          onRename={setRenaming}
          onRemove={setRemoving}
        />
      </aside>

      {/* No card, no header strip: the transcript sits on the page the way a
          chat does. The conversation's own actions live on its row in the
          sidebar, which is where they were already duplicated. */}
      <section class="flex h-full min-h-0 flex-col" aria-label={copy().title}>
        {/* Phone top bar: the drawer on the left, the open chat's name in the
            middle, a fresh chat on the right. */}
        <div class="flex shrink-0 items-center gap-2 border-b border-border-hairline pb-2 lg:hidden">
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={copy().openHistory}
            aria-expanded={historyOpen()}
            onClick={() => setHistoryOpen(true)}
          >
            <IconMenu class="h-5 w-5" />
          </button>
          <h1 class="min-w-0 flex-1 truncate text-center text-sm font-semibold text-text-strong">
            {activeThread()?.title || (threadId() ? copy().untitled : copy().title)}
          </h1>
          <button
            type="button"
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
            aria-label={copy().newThread}
            disabled={!threadId() && messages().length === 0}
            onClick={newThread}
          >
            <IconPlus class="h-5 w-5" />
          </button>
        </div>
        {/* Desktop top bar: the open chat's title and its menu; with the
            sidebar folded away, the way back to it and a fresh chat. */}
        <div class="hidden h-12 shrink-0 items-center gap-1 px-3 lg:flex">
          <Show when={historyCollapsed()}>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={copy().expandHistory}
              title={copy().expandHistory}
              onClick={() => setHistoryCollapsed(false)}
            >
              <IconPanelLeft class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={copy().newThread}
              title={copy().newThread}
              onClick={newThread}
            >
              <IconPlus class="h-4 w-4" />
            </button>
          </Show>
          <Show when={activeThread()}>
            {(thread) => (
              <div class="flex min-w-0 items-center gap-1 pl-1">
                <DropdownMenu placement="bottom-start" gutter={6}>
                  <DropdownMenuTrigger class="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-text-strong outline-hidden transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-expanded:bg-muted">
                    <span class="truncate">{thread().title || copy().untitled}</span>
                    <IconChevronDown class="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="w-48">
                    <DropdownMenuItem class="gap-2.5" onSelect={() => setRenaming(thread())}>
                      <IconEdit class="h-4 w-4" />
                      {copy().rename}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive class="gap-2.5" onSelect={() => setRemoving(thread())}>
                      <IconTrash class="h-4 w-4" />
                      {copy().delete}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </Show>
        </div>
        <Show when={error()}>
          <div class="mx-auto w-full max-w-3xl px-4 pt-1 sm:px-6">
            <Alert variant="destructive">{error()}</Alert>
          </div>
        </Show>
        <div class="relative min-h-0 flex-1">
        <div ref={scroller} onScroll={handleTranscriptScroll} class="h-full overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          <div class="mx-auto w-full max-w-3xl space-y-6">
          <Show
            when={messages().length > 0}
            fallback={
              // The landing screen centres the mark and the composer instead of
              // stranding the composer at the bottom of an empty page.
              <div class="flex min-h-[60vh] flex-col justify-center lg:min-h-[calc(100dvh-16rem)]">
                <RagStudyWelcome title={greeting()} />
                <RagComposer
                  value={draft()}
                  placeholder={copy().placeholder}
                  sendLabel={copy().send}
                  hint={copy().emptyChatHint}
                  disabled={sending()}
                  autofocus
                  class="px-0 sm:px-0"
                  onInput={setDraft}
                  onSubmit={() => void send()}
                />
              </div>
            }
          >
            <For each={messages()}>
              {(message, index) => {
                const scope = () =>
                  message.role === "assistant" && message.status === "complete" && !message.abstained
                    ? scopeFromCitations(message.citations, questionBefore(index()))
                    : null;
                const question = () => questionBefore(index());
                const retryable = () =>
                  message.role === "assistant" &&
                  index() === messages().length - 1 &&
                  (message.status === "complete" || message.status === "failed") &&
                  question() != null;
                return (
                  <RagMessageRow
                    message={message}
                    labels={copy()}
                    onRetry={retryable() ? () => retry(question()!) : undefined}
                    footer={
                      <Show when={scope()}>
                        {(current) => (
                          <RagStudyActions
                            scope={current()}
                            copy={copy()}
                            unavailable={studyUnavailable()}
                            onUnavailable={() => setStudyUnavailable(true)}
                          />
                        )}
                      </Show>
                    }
                  />
                );
              }}
            </For>
          </Show>
          </div>
        </div>
        <Show when={!pinned()}>
          <button
            type="button"
            class={cn(
              "absolute bottom-3 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-md backdrop-blur transition-colors",
              unread()
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-surface-base/95 text-foreground hover:bg-surface-overlay",
            )}
            onClick={scrollToLatest}
          >
            <IconChevronDown class="h-3.5 w-3.5" />
            {unread() ? copy().newMessages : copy().scrollToLatest}
          </button>
        </Show>
        </div>
        <Show when={messages().length > 0}>
          <RagComposer
            value={draft()}
            placeholder={copy().placeholder}
            sendLabel={copy().send}
            hint={copy().emptyChatHint}
            disabled={sending()}
            autofocus
            class="pb-4"
            onInput={setDraft}
            onSubmit={() => void send()}
          />
        </Show>
      </section>

      <ConfirmDialog
        open={renaming() != null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={copy().rename}
        description={copy().renameHint}
        summary={renaming()?.title || copy().untitled}
        confirmLabel={copy().rename}
        prompt={{ label: copy().renameLabel, placeholder: copy().renamePlaceholder, maxLength: 200, initialValue: renaming()?.title ?? "", singleLine: true }}
        onConfirm={async (title) => {
          const thread = renaming();
          if (!thread) return;
          const nextTitle = title?.trim() || null;
          await patchRagThreadById(thread.id, nextTitle);
          if (activeThread()?.id === thread.id) setActiveThread({ ...activeThread()!, title: nextTitle });
          setThreadsVersion((version) => version + 1);
        }}
      />
      <ConfirmDialog
        open={removing() != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={copy().delete}
        description={copy().deleteHint}
        summary={removing()?.title || copy().untitled}
        confirmLabel={copy().deleteConfirm}
        variant="destructive"
        onConfirm={async () => {
          const thread = removing();
          if (!thread) return;
          await deleteRagThreadById(thread.id);
          if (threadId() === thread.id) newThread();
          setThreadsVersion((version) => version + 1);
        }}
      />
    </div>
  );
}
