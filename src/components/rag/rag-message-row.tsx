import { Match, Show, Switch, createSignal, type JSX } from "solid-js";
import type { RagMessage } from "@/api/client";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { IconAlert, IconCopy, IconRefresh } from "@/components/ui/icons";
import { RagCitations } from "@/components/rag/rag-citations";
import { RagThinkingLabel } from "@/components/rag/rag-thinking-label";
import { LogoMark } from "@/components/brand/logo-mark";
import { formatTime } from "@/lib/format";
import { currentLocale } from "@/api/client";

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

  const iconButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

  return (
    // Vibe's turns: the question is a pill on the right; the answer runs the
    // reading column beside a small brand mark, with no frame, and its
    // actions sit on one quiet icon row under it with the time at the end.
    <Show
      when={assistant()}
      fallback={
        <article class="flex justify-end">
          <div class="max-w-[min(36rem,85%)] whitespace-pre-wrap rounded-3xl bg-muted px-4 py-2.5 text-sm text-foreground">
            {props.message.content}
          </div>
        </article>
      }
    >
      <article class="flex gap-3">
        <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-text" aria-hidden="true">
          <LogoMark size={16} />
        </span>
        <div class="min-w-0 flex-1 text-sm text-foreground">
          <Switch>
            <Match when={props.message.status === "pending" && !props.message.content}>
              <p class="animate-pulse pt-1 text-muted-foreground" role="status">
                <RagThinkingLabel phases={[props.labels.thinking, props.labels.thinking2, props.labels.thinking3]} />
              </p>
            </Match>
            <Match when={props.message.status === "failed"}>
              <div class="flex items-start gap-2 pt-1 text-destructive-text">
                <IconAlert class="mt-0.5 h-4 w-4 shrink-0" />
                <p>{failure()}</p>
              </div>
            </Match>
            <Match when={props.message.abstained}>
              <div class="space-y-1 pt-1 text-muted-foreground">
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
          <RagCitations citations={props.message.citations} labels={props.labels} />
          {props.footer}
          <Show when={settled()}>
            <div class="mt-2 flex items-center gap-1">
              <Show when={copyable()}>
                <button
                  type="button"
                  class={iconButton}
                  aria-label={copied() ? props.labels.copied : props.labels.copy}
                  title={copied() ? props.labels.copied : props.labels.copy}
                  onClick={() => void copy()}
                >
                  <IconCopy class="h-3.5 w-3.5" />
                </button>
              </Show>
              <Show when={props.onRetry}>
                {(retry) => (
                  <button
                    type="button"
                    class={iconButton}
                    aria-label={props.labels.retry}
                    title={props.labels.retry}
                    onClick={() => retry()()}
                  >
                    <IconRefresh class="h-3.5 w-3.5" />
                  </button>
                )}
              </Show>
              <Show when={copied()}>
                <span class="text-xs text-muted-foreground" role="status">{props.labels.copied}</span>
              </Show>
              <span class="ml-auto text-xs tabular-nums text-muted-foreground">{formatTime(props.message.created_at, currentLocale())}</span>
            </div>
          </Show>
        </div>
      </article>
    </Show>
  );
}
