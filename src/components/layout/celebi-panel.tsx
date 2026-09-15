import { For, Match, Show, Switch, createEffect, createSignal, onCleanup } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { deleteChatbotThreadById, getChatbotMessageById, getChatbotThreadMessages, getChatbotThreads, patchChatbotThreadById, postChatbotMessage, postChatbotThread, type ChatbotMessage, type ChatbotThread } from "@/api/chatbot";
import { formatApiError } from "@/api/client";
import { CelebiComposer } from "@/components/layout/celebi-composer";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { CelebiReplyActions } from "@/components/layout/celebi-reply-actions";
import { CelebiSuggestions } from "@/components/layout/celebi-suggestions";
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconAlert, IconBotSquare, IconCopy, IconEdit, IconPlus, IconSparkles, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { cn } from "@/lib/cn";
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
  const [threads, setThreads] = createSignal<ChatbotThread[]>([]);
  const [sending, setSending] = createSignal(false);
  const [copiedId, setCopiedId] = createSignal<string>();

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

  // The transcript follows the newest message, but only while the reader is
  // already at the bottom: scrolling up to re-read an earlier answer must not
  // be yanked back down by the next streamed chunk.
  let transcript: HTMLDivElement | undefined;
  const NEAR_BOTTOM_PX = 64;
  const scrollToLatest = () => {
    if (!transcript) return;
    transcript.scrollTop = transcript.scrollHeight;
  };
  createEffect(() => {
    const items = messages();
    typedCount();
    if (!transcript || items.length === 0) return;
    const distance = transcript.scrollHeight - transcript.scrollTop - transcript.clientHeight;
    const atBottom = distance <= NEAR_BOTTOM_PX;
    // The DOM node for the message that just arrived is written after this
    // effect reads the store, so the scroll waits for the next frame.
    if (atBottom) requestAnimationFrame(scrollToLatest);
  });

  let pollTimer: number | undefined;
  let stream: EventSource | undefined;

  const stopPolling = () => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    pollTimer = undefined;
  };
  const stopStream = () => { stream?.close(); stream = undefined; };
  const loadThreads = async () => { try { setThreads((await getChatbotThreads({ limit: 100 })).items); } catch { /* history is non-blocking */ } };
  const openThread = async (id: string) => { stopPolling(); stopStream(); stopReveal(); setThreadId(id); setMessages((await getChatbotThreadMessages(id, { limit: 500 })).items); };
  const createThread = () => { stopPolling(); stopStream(); stopReveal(); setThreadId(undefined); setMessages([]); };
  // Rename and delete go through the shared confirm dialog, never the
  // browser's own prompt()/confirm() boxes.
  const [renaming, setRenaming] = createSignal<ChatbotThread | null>(null);
  const [removing, setRemoving] = createSignal<ChatbotThread | null>(null);
  const renameThread = async (thread: ChatbotThread, title: string | undefined) => {
    await patchChatbotThreadById(thread.id, { title: title?.trim() || null });
    await loadThreads();
  };
  const removeThread = async (thread: ChatbotThread) => {
    await deleteChatbotThreadById(thread.id);
    if (threadId() === thread.id) createThread();
    await loadThreads();
  };
  createEffect(() => { if (props.open) void loadThreads(); });

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
    const source = new EventSource(`/api/chatbot/threads/${encodeURIComponent(activeThreadId)}/messages/${encodeURIComponent(messageId)}/stream`, { withCredentials: true });
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
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("ai.title")} description={t("ai.description")}>
      <div class="flex h-full min-h-0 flex-col">
        <div class="mb-3 flex shrink-0 gap-2 overflow-x-auto border-b border-border pb-3">
          <button type="button" class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent" onClick={createThread}>
            <IconPlus class="h-3.5 w-3.5" />
            {locale() === "tr" ? "Yeni sohbet" : "New chat"}
          </button>
          <For each={threads()}>
            {(thread) => (
              <div class={cn("flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-border", thread.id === threadId() ? "bg-accent" : "bg-card")}>
                <button type="button" class="max-w-[10rem] truncate px-2.5 text-xs text-foreground" onClick={() => void openThread(thread.id)}>
                  {thread.title || (locale() === "tr" ? "Adsız sohbet" : "Untitled chat")}
                </button>
                <button type="button" class="flex h-full w-7 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label={locale() === "tr" ? "Sohbeti yeniden adlandır" : "Rename chat"} onClick={() => setRenaming(thread)}>
                  <IconEdit class="h-3.5 w-3.5" />
                </button>
                <button type="button" class="flex h-full w-7 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" aria-label={locale() === "tr" ? "Sohbeti sil" : "Delete chat"} onClick={() => setRemoving(thread)}>
                  <IconTrash class="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </For>
        </div>
        <div ref={transcript} class="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <Show
          when={messages().length > 0}
          fallback={
            <div class="space-y-3">
              <div class="relative overflow-hidden rounded-lg border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground">
                <div class="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                <span class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <IconSparkles class="h-5 w-5" />
                </span>
                {t("ai.empty")}
              </div>
              <CelebiSuggestions onPick={(text) => void send(text)} />
            </div>
          }
        >
          <div class="flex flex-col gap-3">
            <For each={messages()}>
              {(message) => (
                <div class={message.role === "user" ? "ml-8 rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground" : "mr-6 rounded-lg rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm"}>
                  <Switch>
                    <Match when={message.role === "user"}>
                      <p class="whitespace-pre-wrap leading-6">{message.content}</p>
                    </Match>
                    <Match when={message.status === "failed" && !message.content}>
                      <p class="whitespace-pre-wrap leading-6">{failureMessage(message.error_code)}</p>
                    </Match>
                    {/* The label stands in only until the first characters land;
                        an answer that is still being written keeps typing. */}
                    <Match when={message.status === "pending" && !visibleContent(message)}>
                      <span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse"><CelebiThinkingLabel /></span></span>
                    </Match>
                    <Match when={true}>
                      <CelebiMarkdown text={visibleContent(message)} />
                      <Show when={isRevealing(message)}>
                        <span class="ml-1 inline-block h-3.5 w-0.5 animate-pulse rounded-full bg-primary align-middle" aria-hidden="true" />
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
                    <span class="mt-2 flex items-center gap-1.5 text-xs text-destructive"><IconAlert class="h-3.5 w-3.5" />{failureMessage(message.error_code)}</span>
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
