import { For, Show, createEffect, createSignal, on, onCleanup } from "solid-js";
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
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronDown, IconPlus } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
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
    <div class="grid min-h-[calc(100dvh-10rem)] gap-4 lg:h-[calc(100dvh-10rem)] lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside class="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border-line bg-surface-base p-3 shadow-xs">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-semibold text-text-strong">{copy().history}</h2>
          <Button type="button" size="sm" class="h-8 rounded-lg" disabled={!threadId() && messages().length === 0} onClick={newThread}>
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

      {/* No card, no header strip: the transcript sits on the page the way a
          chat does. The conversation's own actions live on its row in the
          sidebar, which is where they were already duplicated. */}
      <section class="flex h-full min-h-0 flex-col" aria-label={copy().title}>
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
              <div class="flex min-h-[60vh] flex-col justify-center">
                <RagStudyWelcome title={copy().emptyChat} hint={copy().emptyChatHint} />
                <RagComposer
                  value={draft()}
                  placeholder={copy().placeholder}
                  sendLabel={copy().send}
                  hint={copy().composerHint}
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
            hint={copy().composerHint}
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
