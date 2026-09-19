import { For, Match, Show, Switch, createSignal } from "solid-js";
import { ApiError, formatApiError } from "@/api/client";
import type { RagQuestionSet, RagStudyScope, RagSummary } from "@/api/client";
import { postRagQuestions, postRagSummarize } from "@/api/rag";
import { CelebiMarkdown } from "@/components/layout/celebi-markdown";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { ragCopy } from "@/components/rag/rag-copy";

type Copy = ReturnType<typeof ragCopy>;

type StudyResult =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "summary"; data: RagSummary }
  | { kind: "questions"; data: RagQuestionSet };

/** The service's own difficulty vocabulary; the backend defaults to `orta`. */
const DIFFICULTIES = ["kolay", "orta", "zor"] as const;
const QUESTION_COUNT = 5;

/**
 * "Study these passages" under one RAG answer: summarize or draw practice
 * questions from exactly the range that answer cited. A 503 means no AI
 * worker serves these requests right now — the board is told once so every
 * answer's buttons stand down, instead of each failing in turn.
 */
export function RagStudyActions(props: {
  scope: RagStudyScope;
  copy: Copy;
  unavailable: boolean;
  onUnavailable: () => void;
}) {
  const [result, setResult] = createSignal<StudyResult>({ kind: "idle" });
  const [difficulty, setDifficulty] = createSignal<(typeof DIFFICULTIES)[number]>("orta");
  const busy = () => result().kind === "loading";

  const run = async (request: () => Promise<StudyResult>) => {
    if (busy() || props.unavailable) return;
    setResult({ kind: "loading" });
    try {
      setResult(await request());
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        props.onUnavailable();
        setResult({ kind: "idle" });
        return;
      }
      setResult({ kind: "error", message: props.copy.studyFailed(formatApiError(err)) });
    }
  };
  const summarize = () => run(async () => ({ kind: "summary", data: await postRagSummarize(props.scope) }));
  const practice = () =>
    run(async () => ({
      kind: "questions",
      data: await postRagQuestions({ ...props.scope, n: QUESTION_COUNT, difficulty: difficulty() }),
    }));
  const difficultyLabel = (value: string) =>
    value === "kolay" ? props.copy.difficultyEasy : value === "zor" ? props.copy.difficultyHard : props.copy.difficultyMedium;

  return (
    <div class="mt-3 space-y-2 border-t border-border/60 pt-3">
      <p class="text-xs font-medium text-muted-foreground">{props.copy.studyFrom(props.scope.ders)}</p>
      <Show
        when={!props.unavailable}
        fallback={<p class="text-xs text-muted-foreground">{props.copy.studyUnavailable}</p>}
      >
        <div class="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" class="h-8 rounded-lg" disabled={busy()} onClick={() => void summarize()}>
            {props.copy.summarize}
          </Button>
          <Button type="button" size="sm" variant="outline" class="h-8 rounded-lg" disabled={busy()} onClick={() => void practice()}>
            {props.copy.practice}
          </Button>
          <Select
            aria-label={props.copy.difficulty}
            wrapperClass="w-auto"
            class="h-8 rounded-lg text-[13px]"
            value={difficulty()}
            onChange={(event) => setDifficulty(event.currentTarget.value as (typeof DIFFICULTIES)[number])}
          >
            <For each={DIFFICULTIES}>{(value) => <option value={value}>{difficultyLabel(value)}</option>}</For>
          </Select>
        </div>
      </Show>

      <Switch>
        <Match when={result().kind === "loading"}>
          <p class="animate-pulse text-xs text-muted-foreground" role="status">{props.copy.working}</p>
        </Match>
        <Match when={result().kind === "error" && (result() as { message: string }).message}>
          {(message) => <p class="text-xs text-destructive-text" role="alert">{message()}</p>}
        </Match>
        <Match when={result().kind === "summary" && (result() as { data: RagSummary }).data}>
          {(summary) => (
            <section class="space-y-2 rounded-lg border border-border-line bg-muted/30 p-3" aria-label={props.copy.summaryTitle}>
              <p class="text-xs font-semibold text-text-strong">{props.copy.summaryTitle}</p>
              <Show when={!summary().abstained} fallback={<p class="text-xs text-muted-foreground">{summary().text || props.copy.abstained}</p>}>
                <CelebiMarkdown text={summary().text} />
              </Show>
              <Show when={summary().scope_pages.length > 0}>
                <p class="text-xs text-muted-foreground">{props.copy.coveredPages(summary().scope_pages.join(", "))}</p>
              </Show>
            </section>
          )}
        </Match>
        <Match when={result().kind === "questions" && (result() as { data: RagQuestionSet }).data}>
          {(set) => (
            <section class="space-y-2 rounded-lg border border-border-line bg-muted/30 p-3" aria-label={props.copy.questionsTitle}>
              <p class="text-xs font-semibold text-text-strong">{props.copy.questionsTitle}</p>
              <Show
                when={!set().abstained && set().items.length > 0}
                fallback={<p class="text-xs text-muted-foreground">{set().reason ? props.copy.abstainedReason(set().reason) : props.copy.noQuestions}</p>}
              >
                <ol class="list-decimal space-y-2 pl-5 text-sm">
                  <For each={set().items}>
                    {(item) => (
                      <li class="space-y-1">
                        <p>{item.question}</p>
                        <details class="text-xs text-muted-foreground">
                          <summary class="cursor-pointer select-none font-medium text-foreground">{props.copy.showAnswer}</summary>
                          <p class="mt-1 whitespace-pre-wrap">{item.answer}</p>
                        </details>
                      </li>
                    )}
                  </For>
                </ol>
              </Show>
            </section>
          )}
        </Match>
      </Switch>
    </div>
  );
}
