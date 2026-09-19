import { For, Match, Show, Suspense, Switch, createEffect, createSignal, on, onCleanup, untrack, type JSX } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { chatbotStreamUrl, deleteChatbotThreadById, getChatbotMessageById, getChatbotThreadMessages, getChatbotThreads, patchChatbotThreadById, postChatbotMessage, postChatbotThread, type ChatbotMessage, type ChatbotThread } from "@/api/chatbot";
import { formatApiError } from "@/api/client";
import { CelebiComposer } from "@/components/layout/celebi-composer";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { CelebiReplyActions } from "@/components/layout/celebi-reply-actions";
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
import { CelebiThreadList } from "@/components/layout/celebi-thread-list";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconAlert, IconBotSquare, IconChevronDown, IconChevronLeft, IconChevronUp, IconCopy, IconEdit, IconMessage, IconPlus, IconSearch, IconX } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { cn } from "@/lib/cn";
import { matchesSearch, searchMatchRanges } from "@/lib/search-text";
import { usePreferences, useT } from "@/stores/preferences-context";

type PanelMessage = Pick<ChatbotMessage, "id" | "role" | "status" | "content" | "truncated" | "error_code" | "navigation" | "suggestions">;

const POLL_INTERVAL_MS = 1_000;

// A comfortable reading pace for the reveal, and the backlog past which it
// stops pacing and catches up: a rule-based answer often lands whole in the
// `done` event, and nobody should wait out an animation to read it.
const REVEAL_CHARS_PER_SECOND = 90;
const REVEAL_CATCH_UP_CHARS = 320;
const REVEAL_CATCH_UP_FACTOR = 5;

export function CelebiPanel(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const navigate = useNavigate();
  const { locale } = usePreferences();
  const [draft, setDraft] = createSignal("");
  const [messages, setMessages] = createSignal<PanelMessage[]>([]);
  const [threadId, setThreadId] = createSignal<string>();
  const [threadTitle, setThreadTitle] = createSignal<string | null>(null);
  // History lives in its own view so a long list pages instead of piling up
  // as chips above the transcript.
  const [view, setView] = createSignal<"chat" | "threads">("chat");
  const [threadsVersion, setThreadsVersion] = createSignal(0);
  const [sending, setSending] = createSignal(false);
  const [copiedId, setCopiedId] = createSignal<string>();
  const [searchQuery, setSearchQuery] = createSignal("");
  const [searchOpen, setSearchOpen] = createSignal(false);
  const [searchMatchIndex, setSearchMatchIndex] = createSignal(0);

  const copyMessage = async (message: PanelMessage) => {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId((current) => (current === message.id ? undefined : current)), 1_500);
  };

  // Answers arrive either as stream deltas or whole in the `done` event, and
  // both used to appear in one jump. The reveal walks a character count over
  // whatever content the answer has so far, so a streamed answer types itself
  // and a whole one is still read at a human pace. Reduced motion skips it.
  const [typingId, setTypingId] = createSignal<string>();
  const [typedCount, setTypedCount] = createSignal(0);
  let revealFrame: number | undefined;

  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stopReveal = () => {
    if (revealFrame !== undefined) cancelAnimationFrame(revealFrame);
    revealFrame = undefined;
    setTypingId(undefined);
  };

  const startReveal = (messageId: string) => {
    stopReveal();
    if (prefersReducedMotion()) return;
    setTypingId(messageId);
    setTypedCount(0);
    let previous = performance.now();
    const step = (now: number) => {
      const target = messages().find((item) => item.id === messageId);
      if (!target || typingId() !== messageId) return stopReveal();
      const full = target.content.length;
      const behind = full - typedCount();
      const speed = REVEAL_CHARS_PER_SECOND * (behind > REVEAL_CATCH_UP_CHARS ? REVEAL_CATCH_UP_FACTOR : 1);
      setTypedCount((count) => Math.min(full, count + ((now - previous) / 1_000) * speed));
      previous = now;
      // Keep the frame running while the answer is still being written, even
      // once the text in hand is exhausted: the next delta extends it.
      if (typedCount() >= full && target.status !== "pending") return stopReveal();
      revealFrame = requestAnimationFrame(step);
    };
    revealFrame = requestAnimationFrame(step);
  };

  /** How much of a message is on screen — the whole of it unless it is the one revealing. */
  const visibleContent = (message: PanelMessage) =>
    message.id === typingId() ? message.content.slice(0, Math.floor(typedCount())) : message.content;

  const isRevealing = (message: PanelMessage) =>
    message.id === typingId() && (message.status === "pending" || Math.floor(typedCount()) < message.content.length);

  // The transcript follows the newest message only while the reader is
  // pinned to the bottom, the way a messenger does. Any upward scroll unpins
  // at once — a distance threshold alone lost to a streamed answer that grows
  // every frame and kept dragging the reader back down. New content that
  // lands while unpinned raises a "new message" control instead.
  let transcript: HTMLDivElement | undefined;
  const NEAR_BOTTOM_PX = 64;
  const [pinned, setPinned] = createSignal(true);
  const [unread, setUnread] = createSignal(false);
  let lastScrollTop = 0;
  const pinToBottom = () => {
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
    lastScrollTop = transcript.scrollTop;
  };
  const scrollToLatest = () => {
    if (!transcript) return;
    setPinned(true);
    setUnread(false);
    transcript.scrollTo({ top: transcript.scrollHeight, behavior: "smooth" });
  };
  const handleTranscriptScroll = () => {
    if (!transcript || view() !== "chat") return;
    const top = transcript.scrollTop;
    const distance = transcript.scrollHeight - top - transcript.clientHeight;
    // A shrinking transcript (search filtering) clamps scrollTop down too, but
    // leaves it at the very bottom — that is not the reader scrolling up.
    if (top < lastScrollTop - 1 && distance > 1) setPinned(false);
    else if (distance <= NEAR_BOTTOM_PX) {
      setPinned(true);
      setUnread(false);
    }
    lastScrollTop = top;
  };
  const filteredMessages = () => {
    const query = searchQuery().trim();
    if (!query) return messages();
    return messages().filter((message) => matchesSearch(query, message.content));
  };
  const updateSearchQuery = (value: string) => {
    setSearchQuery(value);
    setSearchMatchIndex(0);
  };
  const searchHits = () => {
    const query = searchQuery().trim();
    if (!query) return [] as Array<{ messageId: string }>;
    return messages().flatMap((message) =>
      searchMatchRanges(message.content, query).map(() => ({ messageId: message.id })),
    );
  };
  const activeSearchIndex = () => {
    const total = searchHits().length;
    return total > 0 ? Math.min(searchMatchIndex(), total - 1) : 0;
  };
  const activeSearchHit = () => searchHits()[activeSearchIndex()];
  const scrollToSearchHit = (hit: { messageId: string } | undefined) => {
    if (!hit || !transcript) return;
    const messageNode = Array.from(transcript.querySelectorAll<HTMLElement>("[data-search-message-id]"))
      .find((node) => node.dataset.searchMessageId === hit.messageId);
    messageNode?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const moveSearchMatch = (direction: -1 | 1) => {
    const total = searchHits().length;
    if (total === 0) return;
    const next = (activeSearchIndex() + direction + total) % total;
    setSearchMatchIndex(next);
    requestAnimationFrame(() => scrollToSearchHit(searchHits()[next]));
  };
  const handleSearchKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSearchMatch(-1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSearchMatch(1);
    }
  };
  const highlightedMessageText = (value: string, query: string): JSX.Element => {
    const ranges = searchMatchRanges(value, query);
    if (ranges.length === 0) return <>{value}</>;
    const parts: JSX.Element[] = [];
    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) parts.push(<>{value.slice(cursor, range.start)}</>);
      parts.push(
        <span class="rounded-sm bg-muted/75 px-0.5 text-foreground line-through decoration-muted-foreground/65 decoration-2" data-search-match="true">
          {value.slice(range.start, range.end)}
        </span>,
      );
      cursor = range.end;
    }
    if (cursor < value.length) parts.push(<>{value.slice(cursor)}</>);
    return <>{parts}</>;
  };
  createEffect(() => {
    const hit = activeSearchHit();
    if (!hit) return;
    requestAnimationFrame(() => scrollToSearchHit(hit));
  });
  createEffect(() => {
    const items = messages();
    typedCount();
    if (!transcript || items.length === 0) return;
    if (!untrack(pinned)) return void setUnread(true);
    // The DOM node for the message that just arrived is written after this
    // effect reads the store, so the scroll waits for the next frame.
    requestAnimationFrame(() => { if (pinned()) pinToBottom(); });
  });

  // `display: none` can drop a scroll offset, so coming back from the history
  // view restores it: the bottom when pinned, else where the reader left off.
  createEffect(on(view, (current, previous) => {
    if (current !== "chat" || previous !== "threads") return;
    const saved = lastScrollTop;
    requestAnimationFrame(() => {
      if (!transcript) return;
      if (pinned()) pinToBottom();
      else transcript.scrollTop = lastScrollTop = saved;
    });
  }));

  let pollTimer: number | undefined;
  let stream: EventSource | undefined;

  const stopPolling = () => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    pollTimer = undefined;
  };
  const stopStream = () => { stream?.close(); stream = undefined; };
  // The history view refetches its page on the version bump; the header title
  // of the open chat is refreshed from the newest threads, where it sits once
  // it has just been written to.
  const loadThreads = async () => {
    setThreadsVersion((version) => version + 1);
    const active = threadId();
    if (!active) return;
    try {
      const match = (await getChatbotThreads({ limit: 10 })).items.find((thread) => thread.id === active);
      if (match && threadId() === active) setThreadTitle(match.title);
    } catch { /* history is non-blocking */ }
  };
  const openThread = async (thread: ChatbotThread) => { stopPolling(); stopStream(); stopReveal(); setPinned(true); setUnread(false); setView("chat"); setSearchOpen(false); updateSearchQuery(""); setThreadId(thread.id); setThreadTitle(thread.title); setMessages((await getChatbotThreadMessages(thread.id, { limit: 500 })).items); };
  const createThread = () => { stopPolling(); stopStream(); stopReveal(); setSearchOpen(false); updateSearchQuery(""); setThreadId(undefined); setThreadTitle(null); setMessages([]); };
  const startNewChat = () => { createThread(); setView("chat"); };
  const openThreads = () => { setSearchOpen(false); setSearchQuery(""); setView("threads"); };
  // Rename and delete go through the shared confirm dialog, never the
  // browser's own prompt()/confirm() boxes.
  const [renaming, setRenaming] = createSignal<ChatbotThread | null>(null);
  const [removing, setRemoving] = createSignal<ChatbotThread | null>(null);
  const renameActiveThread = () => {
    const activeId = threadId();
    if (!activeId) return;
    setRenaming({ id: activeId, title: threadTitle(), created_at: 0, updated_at: 0 });
  };
  const renameThread = async (thread: ChatbotThread, title: string | undefined) => {
    const updated = await patchChatbotThreadById(thread.id, { title: title?.trim() || null });
    if (threadId() === thread.id) setThreadTitle(updated.title);
    await loadThreads();
  };
  const removeThread = async (thread: ChatbotThread) => {
    await deleteChatbotThreadById(thread.id);
    if (threadId() === thread.id) createThread();
    await loadThreads();
  };

  const failureMessage = (code: string | null) => {
    if (locale() === "tr") return code ? `Yanıt alınamadı (${code}).` : "Yanıt alınamadı. Lütfen tekrar dene.";
    return code ? `No response was received (${code}).` : "No response was received. Please try again.";
  };

  const updateAssistant = (message: ChatbotMessage) => {
    setMessages((items) => items.map((item) => (item.id === message.id ? message : item)));
    if (message.status !== "pending") stopPolling();
  };

  const poll = (activeThreadId: string, messageId: string) => {
    stopPolling();
    const read = async () => {
      try {
        updateAssistant(await getChatbotMessageById(activeThreadId, messageId));
      } catch {
        // A transient poll failure should not turn a received request into an error.
      }
    };
    void read();
    pollTimer = window.setInterval(() => void read(), POLL_INTERVAL_MS);
  };

  const streamAnswer = (activeThreadId: string, messageId: string) => {
    stopStream();
    const source = new EventSource(chatbotStreamUrl(activeThreadId, messageId), { withCredentials: true });
    stream = source;
    source.addEventListener("delta", (event) => { try { const data = JSON.parse((event as MessageEvent).data) as { text?: unknown }; if (typeof data.text === "string") setMessages((items) => items.map((item) => item.id === messageId ? { ...item, content: item.content + data.text } : item)); } catch { /* ignore malformed chunk */ } });
    source.addEventListener("done", (event) => { try { updateAssistant((JSON.parse((event as MessageEvent).data) as { message: ChatbotMessage }).message); } catch { poll(activeThreadId, messageId); } finally { stopStream(); void loadThreads(); } });
    source.addEventListener("error", () => { stopStream(); poll(activeThreadId, messageId); });
    source.onerror = () => { stopStream(); poll(activeThreadId, messageId); };
  };

  onCleanup(() => { stopPolling(); stopStream(); stopReveal(); });

  const send = async (override?: string) => {
    // A suggestion chip sends its own text without ever touching the draft.
    const content = (override ?? draft()).trim();
    if (!content || sending()) return;

    setSending(true);
    setDraft("");
    // Sending is a request to see the reply: re-pin even if scrolled up.
    setPinned(true);
    setUnread(false);
    const localUserId = `local-${Date.now()}`;
    setMessages((items) => [...items, { id: localUserId, role: "user", status: "complete", content, truncated: false, error_code: null }]);

    try {
      const activeThreadId = threadId() ?? (await postChatbotThread()).id;
      setThreadId(activeThreadId);
      const accepted = await postChatbotMessage(activeThreadId, content);
      setMessages((items) => [
        ...items,
        {
          id: accepted.message_id,
          thread_id: activeThreadId,
          role: "assistant",
          status: "pending",
          content: "",
          truncated: false,
          error_code: null,
          created_at: Date.now(),
          completed_at: null,
        },
      ]);
      startReveal(accepted.message_id);
      streamAnswer(activeThreadId, accepted.message_id);
      void loadThreads();
    } catch (error) {
      setMessages((items) => [
        ...items,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          status: "failed",
          content: formatApiError(error, locale()),
          truncated: false,
          error_code: null,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("ai.title")} description={t("ai.description")} bodyClass="overflow-hidden pb-0">
      <div class="flex h-full min-h-0 flex-col">
        <div class="mb-3 shrink-0 border-b border-border pb-3">
          <Show
            when={view() === "chat"}
            fallback={
              <div class="flex min-w-0 items-center gap-2">
                <button type="button" class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent" onClick={() => setView("chat")}>
                  <IconChevronLeft class="h-3.5 w-3.5" />
                  {t("common.back")}
                </button>
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{t("ai.chats")}</span>
                <button type="button" class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent" onClick={(event) => { event.preventDefault(); startNewChat(); }}>
                  <IconPlus class="h-3.5 w-3.5" />
                  {t("ai.newChat")}
                </button>
              </div>
            }
          >
            <div class="flex min-w-0 items-center justify-between gap-3">
              <div class="flex shrink-0 items-center gap-1.5">
                <button type="button" class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent" onClick={(event) => { event.preventDefault(); startNewChat(); }}>
                  <IconPlus class="h-3.5 w-3.5" />
                  {t("ai.newChat")}
                </button>
                <button type="button" class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent" onClick={(event) => { event.preventDefault(); openThreads(); }}>
                  <IconMessage class="h-3.5 w-3.5" />
                  {t("ai.chats")}
                </button>
              </div>
              <Show when={threadId()}>
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{threadTitle() || t("ai.untitledChat")}</span>
                <button
                  type="button"
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={t("ai.renameChat")}
                  title={t("ai.renameChat")}
                  onClick={(event) => { event.preventDefault(); renameActiveThread(); }}
                >
                  <IconEdit class="h-3.5 w-3.5" />
                </button>
              </Show>
              <div class="flex shrink-0 items-center">
                <Show
                  when={!searchOpen()}
                  fallback={
                    <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-xs font-medium text-foreground transition-colors hover:bg-accent" aria-label={t("common.close")} title={t("common.close")} onClick={() => { setSearchOpen(false); updateSearchQuery(""); }}>
                      <IconX class="h-3.5 w-3.5" />
                    </button>
                  }
                >
                  <button type="button" class="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-xs font-medium text-foreground transition-colors hover:bg-accent" aria-label={t("common.search")} title={t("common.search")} aria-expanded={searchOpen()} onClick={(event) => { event.preventDefault(); setSearchOpen(true); }}>
                    <IconSearch class="h-3.5 w-3.5" />
                  </button>
                </Show>
              </div>
            </div>
          </Show>
        </div>
        <Show when={view() === "threads"}>
          <div class="min-h-0 flex-1">
            <Suspense fallback={<PageSpinner />}>
              <CelebiThreadList
                activeId={threadId()}
                version={threadsVersion()}
                onOpen={(thread) => void openThread(thread)}
                onRename={setRenaming}
                onRemove={setRemoving}
              />
            </Suspense>
          </div>
        </Show>
        {/* Hidden rather than unmounted while the history is open, so going
            back lands on the same scroll position and a streaming answer
            keeps writing. */}
        <div class={cn("flex min-h-0 flex-1 flex-col", view() !== "chat" && "hidden")}>
        <Show when={searchOpen()}>
          <div class="mb-3 flex shrink-0 items-start gap-2">
            <DataTableSearch
              value={searchQuery()}
              onChange={updateSearchQuery}
              onKeyDown={handleSearchKeyDown}
              placeholder={t("ai.searchPlaceholder")}
              hint={t("search.hint.chat")}
              hintClass="w-full min-w-0 max-w-none border-primary/40 bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg"
              class="min-w-0 flex-1 sm:max-w-none"
            />
            <Show when={searchQuery().trim()}>
              <div class="flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card px-1 shadow-sm">
                <span class="px-1.5 text-[11px] tabular-nums text-muted-foreground" aria-live="polite">
                  {t("ai.searchCount", { current: searchHits().length > 0 ? activeSearchIndex() + 1 : 0, total: searchHits().length })}
                </span>
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  aria-label={t("common.prev")}
                  title={t("common.prev")}
                  disabled={searchHits().length === 0}
                  onClick={() => moveSearchMatch(-1)}
                >
                  <IconChevronUp class="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                  aria-label={t("common.next")}
                  title={t("common.next")}
                  disabled={searchHits().length === 0}
                  onClick={() => moveSearchMatch(1)}
                >
                  <IconChevronDown class="h-3.5 w-3.5" />
                </button>
              </div>
            </Show>
          </div>
        </Show>
        {/* The jump control floats over the bottom of the transcript, next to
            the newest message it leads to, instead of sitting up by search. */}
        <div class="relative flex min-h-0 flex-1 flex-col">
        <div ref={transcript} onScroll={handleTranscriptScroll} class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <Show
          when={messages().length > 0}
          fallback={
            <EmptyInline class="h-full py-10" size="md" illustration="messages" title={t("ai.title")} hint={t("ai.empty")} />
          }
        >
          <Show
            when={filteredMessages().length > 0}
            fallback={<p class="py-10 text-center text-sm text-muted-foreground">{t("ai.noSearchResults")}</p>}
          >
          <div class="flex flex-col gap-3">
            <For each={filteredMessages()}>
              {(message) => (
                <div
                  data-search-message-id={message.id}
                  class={cn(
                    message.role === "user" ? "ml-8 rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground selection:bg-primary-foreground selection:text-primary-text" : "mr-6 rounded-lg rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm",
                    activeSearchHit()?.messageId === message.id && "ring-2 ring-primary/35",
                  )}
                >
                  <Switch>
                    <Match when={message.role === "user"}>
                      <p class="whitespace-pre-wrap leading-6">{highlightedMessageText(message.content, searchQuery())}</p>
                    </Match>
                    <Match when={message.status === "failed" && !message.content}>
                      <p class="whitespace-pre-wrap leading-6">{failureMessage(message.error_code)}</p>
                    </Match>
                    {/* The label stands in only until the first characters land;
                        an answer that is still being written keeps typing. */}
                    <Match when={message.status === "pending" && !visibleContent(message)}>
                      <span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary-text" /><span class="animate-pulse"><CelebiThinkingLabel /></span></span>
                    </Match>
                    <Match when={true}>
                      <CelebiMarkdown text={visibleContent(message)} showCursor={isRevealing(message)} searchQuery={searchQuery()} />
                      <Show when={isRevealing(message)}>
                        <button
                          type="button"
                          class="mt-2 block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={stopReveal}
                        >
                          {t("ai.skipTyping")}
                        </button>
                      </Show>
                    </Match>
                  </Switch>
                  <Show when={message.role === "assistant" && message.status === "failed"}>
                    <span class="mt-2 flex items-center gap-1.5 text-xs text-destructive-text"><IconAlert class="h-3.5 w-3.5" />{failureMessage(message.error_code)}</span>
                  </Show>
                  <Show when={message.role === "assistant" && message.truncated}>
                    <p class="mt-2 text-xs text-muted-foreground">{locale() === "tr" ? "Yanıt uzunluk sınırında kısaltıldı." : "Response was shortened at the configured limit."}</p>
                  </Show>
                  <Show when={message.role === "assistant" && message.status === "complete" && !isRevealing(message)}>
                    <CelebiReplyActions
                      navigation={message.navigation}
                      suggestions={message.suggestions}
                      onNavigate={(route) => {
                        props.onOpenChange(false);
                        // The route is checked in celebi-route.ts, but it is a
                        // runtime string either way — the router's typed table
                        // cannot describe it.
                        void navigate({ to: route as never });
                      }}
                      onPick={(text) => void send(text)}
                    />
                  </Show>
                  <Show when={message.role === "assistant" && message.status === "complete"}>
                    <button
                      type="button"
                      class="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => void copyMessage(message)}
                    >
                      <IconCopy class="h-3 w-3" />
                      {copiedId() === message.id ? t("ai.copied") : t("ai.copy")}
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>
          </Show>
          </Show>
        </div>
        <Show when={!pinned()}>
          <button
            type="button"
            class={cn(
              "absolute bottom-3 left-1/2 inline-flex h-8 -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 text-xs font-medium shadow-md backdrop-blur transition-colors",
              unread() ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : "border-border bg-card/95 text-foreground hover:bg-accent",
            )}
            onClick={scrollToLatest}
          >
            <IconChevronDown class="h-3.5 w-3.5" />
            {unread() ? t("ai.newMessages") : t("ai.scrollToLatest")}
          </button>
        </Show>
        </div>
        <div class="mt-4 shrink-0">
          <CelebiComposer
            value={draft()}
            onInput={setDraft}
            onSubmit={() => void send()}
            disabled={!draft().trim() || sending()}
          />
        </div>
        </div>
      </div>
      <ConfirmDialog
        open={renaming() != null}
        onOpenChange={(open) => !open && setRenaming(null)}
        title={t("ai.renameChat")}
        description={t("ai.renameChatHint")}
        summary={renaming()?.title || t("ai.untitledChat")}
        confirmLabel={t("common.save")}
        icon={<IconEdit class="h-4 w-4" />}
        prompt={{ label: t("ai.chatTitle"), initialValue: renaming()?.title ?? "", maxLength: 120, singleLine: true }}
        onConfirm={(title) => renameThread(renaming()!, title)}
      />
      <ConfirmDialog
        open={removing() != null}
        onOpenChange={(open) => !open && setRemoving(null)}
        variant="destructive"
        title={t("ai.deleteChat")}
        description={t("ai.deleteChatHint")}
        summary={removing()?.title || t("ai.untitledChat")}
        onConfirm={() => removeThread(removing()!)}
      />
    </SidePanel>
  );
}
