import { For, Show, createSignal, onCleanup } from "solid-js";
import { getChatbotMessageById, postChatbotMessage, postChatbotThread, type ChatbotMessage } from "@/api/chatbot";
import { formatApiError } from "@/api/client";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { Button } from "@/components/ui/button";
import { IconAlert, IconBotSquare, IconSend, IconSparkles } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { usePreferences, useT } from "@/stores/preferences-context";

type PanelMessage = Pick<ChatbotMessage, "id" | "role" | "status" | "content" | "truncated" | "error_code">;

const POLL_INTERVAL_MS = 1_000;

export function CelebiPanel(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const { locale } = usePreferences();
  const [draft, setDraft] = createSignal("");
  const [messages, setMessages] = createSignal<PanelMessage[]>([]);
  const [threadId, setThreadId] = createSignal<string>();
  const [sending, setSending] = createSignal(false);
  let pollTimer: number | undefined;

  const stopPolling = () => {
    if (pollTimer !== undefined) window.clearInterval(pollTimer);
    pollTimer = undefined;
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

  onCleanup(stopPolling);

  const send = async () => {
    const content = draft().trim();
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
      poll(activeThreadId, accepted.message_id);
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
      <div class="flex flex-col gap-4">
        <Show
          when={messages().length > 0}
          fallback={
            <div class="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-9 text-center text-sm text-muted-foreground">
              <div class="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <span class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <IconSparkles class="h-5 w-5" />
              </span>
              {t("ai.empty")}
            </div>
          }
        >
          <div class="flex flex-col gap-3">
            <For each={messages()}>
              {(message) => (
                <div class={message.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground" : "mr-6 rounded-2xl rounded-bl-sm border border-border bg-card px-3.5 py-2.5 text-sm text-foreground shadow-sm"}>
                  <Show when={message.role === "assistant" && message.status === "pending"} fallback={
                    <Show when={message.role === "assistant" && message.status === "failed" && !message.content} fallback={
                      <Show when={message.role === "assistant"} fallback={<p class="whitespace-pre-wrap leading-6">{message.content}</p>}>
                        <CelebiMarkdown text={message.content} />
                      </Show>
                    }>
                      <p class="whitespace-pre-wrap leading-6">{failureMessage(message.error_code)}</p>
                    </Show>
                  }>
                    <span class="flex items-center gap-2 text-muted-foreground"><IconBotSquare class="h-4 w-4 text-primary" /><span class="animate-pulse">•••</span></span>
                  </Show>
                  <Show when={message.role === "assistant" && message.status === "failed"}>
                    <span class="mt-2 flex items-center gap-1.5 text-xs text-destructive"><IconAlert class="h-3.5 w-3.5" />{failureMessage(message.error_code)}</span>
                  </Show>
                  <Show when={message.role === "assistant" && message.truncated}>
                    <p class="mt-2 text-xs text-muted-foreground">{locale() === "tr" ? "Yanıt uzunluk sınırında kısaltıldı." : "Response was shortened at the configured limit."}</p>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>
        <form class="sticky bottom-0 rounded-2xl border border-border bg-card p-2 shadow-sm" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <Textarea rows={3} class="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" value={draft()} placeholder={t("ai.placeholder")} onInput={(event) => setDraft(event.currentTarget.value)} />
          <div class="flex items-center justify-between px-1 pt-2">
            <span class="text-xs text-muted-foreground">{locale() === "tr" ? "Çelebi yanıtları yapay zekâ tarafından üretilir." : "Çelebi responses are AI-generated."}</span>
            <Button type="submit" size="sm" class="rounded-xl" disabled={!draft().trim() || sending()}>
              <IconSend class="mr-1.5 h-4 w-4" />{t("ai.send")}
            </Button>
          </div>
        </form>
      </div>
    </SidePanel>
  );
}
