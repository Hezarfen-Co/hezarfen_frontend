import { Match, Show, Switch, type JSX } from "solid-js";
import type { RagMessage } from "@/api/client";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { IconAlert, IconBotSquare } from "@/components/ui/icons";
import { RagCitations } from "@/components/rag/rag-citations";
import { cn } from "@/lib/cn";

export function RagMessageRow(props: {
  message: RagMessage;
  /** Rendered under the citations of an answer (e.g. study actions). */
  footer?: JSX.Element;
  labels: {
    thinking: string;
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
  const assistant = () => props.message.role === "assistant";
  const failure = () => props.message.error_code
    ? props.labels.failedWithCode(props.message.error_code)
    : props.labels.failed;

  return (
    <article class={cn("flex gap-3", assistant() ? "justify-start" : "justify-end")}>
      <Show when={assistant()}>
        <span class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary-text">
          <IconBotSquare class="h-4 w-4" />
        </span>
      </Show>
      <div
        class={cn(
          "max-w-[min(46rem,88%)] rounded-xl px-4 py-3 text-sm",
          assistant() ? "border border-border-line bg-surface-base text-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <Switch>
          <Match when={props.message.status === "pending" && !props.message.content}>
            <p class="animate-pulse text-muted-foreground" role="status">{props.labels.thinking}</p>
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
        </Show>
      </div>
    </article>
  );
}
