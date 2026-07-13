import { For, Show, Suspense, createResource } from "solid-js";
import { getStudentAnswers } from "@/api/getStudentAnswers";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

export function AnswerSheetView(props: { examId: string; userId: string }) {
  const t = useT();
  const [sheet] = createResource(
    () => [props.examId, props.userId] as const,
    async ([examId, userId]) => getStudentAnswers(examId, userId),
  );

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={sheet()}>
        {(s) => (
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-3">
              <p class="text-sm font-medium">{props.userId}</p>
              <Badge variant="secondary">
                {t("exams.autoScore")}: {s().auto_score.earned}/{s().auto_score.possible}
              </Badge>
            </div>

            <For each={s().answers}>
              {(answer, idx) => (
                <div class="rounded-md border p-4">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold text-muted-foreground">#{idx() + 1}</span>
                    <Badge variant="outline">{answer.points} {t("questions.points")}</Badge>
                    <Badge variant={answer.is_correct === true ? "default" : answer.is_correct === false ? "destructive" : "outline"}>
                      {answer.is_correct === true ? t("exams.isCorrect") :
                       answer.is_correct === false ? "✗" :
                       answer.kind === "text" ? t("questions.kind.text") : "—"}
                    </Badge>
                    <Badge variant="outline">{t("exams.autoScore")}: {answer.auto_score.earned}/{answer.auto_score.possible}</Badge>
                  </div>
                  <p class="mb-3 whitespace-pre-wrap text-sm font-medium">{answer.text}</p>

                  <Show
                    when={answer.kind === "choice"}
                    fallback={
                      <div class="rounded-sm bg-muted/40 p-3">
                        <p class="text-xs text-muted-foreground">{t("exams.textAnswer")}</p>
                        <p class="mt-1 whitespace-pre-wrap text-sm">{answer.text_answer || "—"}</p>
                      </div>
                    }
                  >
                    <div class="space-y-1.5">
                      <For each={answer.choices}>
                        {(choice, ci) => (
                          <div
                            class={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                              ci() === answer.correct && ci() === answer.selected
                                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                : ci() === answer.correct
                                  ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                                  : ci() === answer.selected
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border"
                            }`}
                          >
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border text-[11px] font-medium">
                              {ci() === answer.correct || ci() === answer.selected
                                ? ci() === answer.correct && ci() === answer.selected
                                  ? "✓"
                                  : ci() === answer.correct
                                    ? "✓"
                                    : "✗"
                                : String.fromCharCode(65 + ci())}
                            </span>
                            <span>{choice}</span>
                            {ci() === answer.correct && <Badge variant="outline" class="ml-auto text-[10px]">{t("questions.correct")}</Badge>}
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
