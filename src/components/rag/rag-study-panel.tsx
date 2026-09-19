import { For, Show, createSignal, onCleanup } from "solid-js";
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
import { RagThreadList } from "@/components/rag/rag-thread-list";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconEdit, IconPlus } from "@/components/ui/icons";
import { scopeFromCitations } from "@/lib/rag-study-scope";
import { usePreferences } from "@/stores/preferences-context";

const POLL_INTERVAL_MS = 2000;

/**
 * The AI hub's Study tab: chat over the course material the account may
 * read (`/rag/*`), every answer with its sources, and under each sourced
 * answer a way to summarize or practise exactly that range. Çelebi keeps its
 * own general chat on `/chatbot`; this is the grounded one.
 */
export function RagStudyPanel() {
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

  const openThread = async (thread: RagThread) => {
    stopPolling();
    stopStream();
    setError("");
    setThreadId(thread.id);
    setActiveThread(thread);
    try {
      setMessages((await getRagThreadMessages(thread.id, { limit: 500 })).items);
    } catch (err) {
      setError(formatApiError(err));
    }
  };
  const newThread = () => {
    stopPolling();
    stopStream();
    setError("");
    setThreadId(undefined);
    setActiveThread(undefined);
    setMessages([]);
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

  /** The user turn an answer replies to, used as the study range's label. */
  const questionBefore = (index: number) => {
    for (let i = index - 1; i >= 0; i -= 1) if (messages()[i]?.role === "user") return messages()[i]!.content;
    return undefined;
  };

  return (
    <div class="grid min-h-[calc(100dvh-10rem)] gap-4 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside class="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-3 shadow-xs">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-text-strong">{copy().history}</h2>
          <Button type="button" size="sm" class="h-8 rounded-lg" onClick={newThread}>
            <IconPlus class="h-4 w-4" />
            {copy().newThread}
          </Button>
        </div>
        <RagThreadList
          activeId={threadId()}
          version={threadsVersion()}
          locale={locale()}
          labels={copy()}
          onOpen={(thread) => void openThread(thread)}
          onRename={setRenaming}
          onRemove={setRemoving}
        />
      </aside>

      <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border-line bg-surface-base shadow-xs" aria-label={copy().title}>
        <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border-line px-4 py-3">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{copy().tabLabel}</p>
            <p class="truncate text-sm font-semibold text-text-strong">{activeThread()?.title || (threadId() ? copy().untitled : copy().emptyChat)}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <Show when={activeThread()}>
              {(thread) => (
                <Button type="button" size="sm" variant="outline" class="h-8 rounded-lg" aria-label={copy().rename} title={copy().rename} onClick={() => setRenaming(thread())}>
                  <IconEdit class="h-3.5 w-3.5" />
                </Button>
              )}
            </Show>
          </div>
        </header>
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <Show
            when={messages().length > 0}
            fallback={<p class="py-16 text-center text-sm text-muted-foreground">{copy().emptyChatHint}</p>}
          >
            <For each={messages()}>
              {(message, index) => {
                const scope = () =>
                  message.role === "assistant" && message.status === "complete" && !message.abstained
                    ? scopeFromCitations(message.citations, questionBefore(index()))
                    : null;
                return (
                  <RagMessageRow
                    message={message}
                    labels={copy()}
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
        <RagComposer
          value={draft()}
          placeholder={copy().placeholder}
          sendLabel={copy().send}
          hint={copy().composerHint}
          disabled={sending()}
          onInput={setDraft}
          onSubmit={() => void send()}
        />
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
