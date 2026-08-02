import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import { deleteChatbotThreadById, getChatbotMessageById, getChatbotThreadMessages, getChatbotThreads, patchChatbotThreadById, postChatbotMessage, postChatbotThread, type ChatbotMessage, type ChatbotThread } from "@/api/chatbot";
import { formatApiError } from "@/api/client";
import { CelebiComposer } from "@/components/layout/celebi-composer";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { CelebiSuggestions } from "@/components/layout/celebi-suggestions";
import { CelebiThinkingLabel } from "@/components/layout/celebi-thinking-label";
import { IconAlert, IconBotSquare, IconCopy, IconSparkles } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { usePreferences, useT } from "@/stores/preferences-context";

type PanelMessage = Pick<ChatbotMessage, "id" | "role" | "status" | "content" | "truncated" | "error_code">;

const POLL_INTERVAL_MS = 1_000;

export function CelebiPanel(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
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

  let pollTimer: number | undefined;
  let stream: EventSource | undefined;

  const stopPolling = () => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    pollTimer = undefined;
  };
  const stopStream = () => { stream?.close(); stream = undefined; };
  const loadThreads = async () => { try { setThreads((await getChatbotThreads({ limit: 100 })).items); } catch { /* history is non-blocking */ } };
  const openThread = async (id: string) => { stopPolling(); stopStream(); setThreadId(id); setMessages((await getChatbotThreadMessages(id, { limit: 500 })).items); };
  const createThread = () => { stopPolling(); stopStream(); setThreadId(undefined); setMessages([]); };
  const renameThread = async (thread: ChatbotThread) => { const title = window.prompt(locale() === "tr" ? "Sohbet başlığı" : "Conversation title", thread.title ?? ""); if (title !== null) { await patchChatbotThreadById(thread.id, { title: title.trim() || null }); await loadThreads(); } };
  const removeThread = async (thread: ChatbotThread) => { if (!window.confirm(locale() === "tr" ? "Bu sohbet silinsin mi?" : "Delete this conversation?")) return; await deleteChatbotThreadById(thread.id); if (threadId() === thread.id) createThread(); await loadThreads(); };
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

  onCleanup(() => { stopPolling(); stopStream(); });

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
          <button type="button" class="rounded-lg border px-2.5 py-1.5 text-xs font-medium" onClick={createThread}>{locale() === "tr" ? "Yeni sohbet" : "New chat"}</button>
          <For each={threads()}>{(thread) => <div class="flex shrink-0 overflow-hidden rounded-lg border"><button type="button" class={thread.id === threadId() ? "bg-muted px-2.5 py-1.5 text-xs font-medium" : "px-2.5 py-1.5 text-xs"} onClick={() => void openThread(thread.id)}>{thread.title || (locale() === "tr" ? "Adsız sohbet" : "Untitled chat")}</button><button type="button" class="border-l px-2 text-xs" aria-label={locale() === "tr" ? "Sohbeti yeniden adlandır" : "Rename chat"} onClick={() => void renameThread(thread)}>✎</button><button type="button" class="border-l px-2 text-xs text-destructive" aria-label={locale() === "tr" ? "Sohbeti sil" : "Delete chat"} onClick={() => void removeThread(thread)}>×</button></div>}</For>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto pr-1">
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
                  <Show when={message.role === "assistant" && message.status === "pending"} fallback={
                    <Show when={message.role === "assistant" && message.status === "failed" && !message.content} fallback={
                      <Show when={message.role === "assistant"} fallback={<p class="whitespace-pre-wrap leading-6">{message.content}</p>}>
                        <CelebiMarkdown text={message.content} />
                      </Show>
                    }>
                      <p class="whitespace-pre-wrap leading-6">{failureMessage(message.error_code)}</p>
                    </Show>
                  }>
                    <span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse"><CelebiThinkingLabel /></span></span>
                  </Show>
                  <Show when={message.role === "assistant" && message.status === "failed"}>
                    <span class="mt-2 flex items-center gap-1.5 text-xs text-destructive"><IconAlert class="h-3.5 w-3.5" />{failureMessage(message.error_code)}</span>
                  </Show>
                  <Show when={message.role === "assistant" && message.truncated}>
                    <p class="mt-2 text-xs text-muted-foreground">{locale() === "tr" ? "Yanıt uzunluk sınırında kısaltıldı." : "Response was shortened at the configured limit."}</p>
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
    </SidePanel>
  );
}
