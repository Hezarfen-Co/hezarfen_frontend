import { Match, Show, Switch, createSignal, type JSX } from "solid-js";
import type { RagMessage } from "@/api/client";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { IconAlert, IconCopy, IconRefresh } from "@/components/ui/icons";
import { RagCitations } from "@/components/rag/rag-citations";
import { RagThinkingLabel } from "@/components/rag/rag-thinking-label";
import { cn } from "@/lib/cn";

export function RagMessageRow(props: {
  message: RagMessage;
  /** Rendered under the citations of an answer (e.g. study actions). */
  footer?: JSX.Element;
  /**
   * Re-asks the question this answer replies to. Passed only for the newest
   * answer — re-asking an older one would append it at the end of the
   * transcript, far from the turn the reader was looking at.
   */
  onRetry?: () => void;
  labels: {
    thinking: string;
    thinking2: string;
    thinking3: string;
    copy: string;
    copied: string;
    retry: string;
    sources: string;
    source: string;
    subject: string;
    pages: string;
    document: string;
    failed: string;
    failedWithCode: (code: string) => string;
    abstained: string;
    abstainedReason: (reason: string) => string;
  };
}) {
  const [copied, setCopied] = createSignal(false);
  const assistant = () => props.message.role === "assistant";
  const failure = () => props.message.error_code
    ? props.labels.failedWithCode(props.message.error_code)
    : props.labels.failed;
  const settled = () => props.message.status === "complete" || props.message.status === "failed";
  const copyable = () => assistant() && props.message.status === "complete" && !!props.message.content;

  const copy = async () => {
    await navigator.clipboard.writeText(props.message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    // The user's turn is a bubble; the answer is not. An answer is the page's
    // content, not a message in a thread, so it runs the full reading column
    // with no frame and no avatar competing with the first line of text.
    <article class={cn("flex", assistant() ? "justify-start" : "justify-end")}>
      <div
        class={cn(
          "text-sm",
          assistant()
            ? "w-full min-w-0 text-foreground"
            : "max-w-[min(46rem,88%)] rounded-xl bg-primary px-4 py-3 text-primary-foreground",
        )}
      >
        <Switch>
          <Match when={props.message.status === "pending" && !props.message.content}>
            <p class="animate-pulse text-muted-foreground" role="status">
              <RagThinkingLabel phases={[props.labels.thinking, props.labels.thinking2, props.labels.thinking3]} />
            </p>
          </Match>
          <Match when={props.message.status === "failed"}>
            <div class="flex items-start gap-2 text-destructive-text">
              <IconAlert class="mt-0.5 h-4 w-4 shrink-0" />
              <p>{failure()}</p>
            </div>
          </Match>
          <Match when={props.message.abstained}>
            <div class="space-y-1 text-muted-foreground">
              <p>{props.message.content || props.labels.abstained}</p>
              <Show when={props.message.reason}>
                <p class="text-xs">{props.labels.abstainedReason(props.message.reason)}</p>
              </Show>
            </div>
          </Match>
          <Match when={true}>
            <CelebiMarkdown text={props.message.content} />
          </Match>
        </Switch>
        <Show when={assistant()}>
          <RagCitations citations={props.message.citations} labels={props.labels} />
          {props.footer}
          <Show when={settled() && (copyable() || props.onRetry)}>
            <div class="mt-2 flex flex-wrap items-center gap-3">
              <Show when={copyable()}>
                <button
                  type="button"
                  class="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => void copy()}
                >
                  <IconCopy class="h-3 w-3" />
                  {copied() ? props.labels.copied : props.labels.copy}
                </button>
              </Show>
              <Show when={props.onRetry}>
                {(retry) => (
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => retry()()}
                  >
                    <IconRefresh class="h-3 w-3" />
                    {props.labels.retry}
                  </button>
                )}
              </Show>
            </div>
          </Show>
        </Show>
      </div>
    </article>
  );
}
