import { For, Show, Suspense, createResource } from "solid-js";
import { getExamQuestions } from "@/api/getExamQuestions";
import { getStudentAnswers } from "@/api/getStudentAnswers";
import { Badge } from "@/components/ui/badge";
import { PageSpinner } from "@/components/ui/page-spinner";
import { joinAnswerSheet } from "@/lib/answer-sheet";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function AnswerSheetView(props: { examId: string; userId: string }) {
  const t = useT();
  const [data] = createResource(
    () => [props.examId, props.userId] as const,
    async ([examId, userId]) => {
      const [questions, sheet] = await Promise.all([getExamQuestions(examId), getStudentAnswers(examId, userId)]);
      return { sheet, rows: joinAnswerSheet(questions.items, sheet.answers) };
    },
  );

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show when={data()}>
        {(d) => (
          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-3">
              <p class="text-sm font-medium">{personLabelWithId(d().sheet.user)}</p>
              <Badge variant="secondary">
                {t("exams.autoScore")}: {d().sheet.auto_score.earned}/{d().sheet.auto_score.possible}
              </Badge>
            </div>

            <For each={d().rows}>
              {(row, idx) => (
                <div class="rounded-md border p-4">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold text-muted-foreground">#{idx() + 1}</span>
                    <Badge variant="outline">{row.question.points} {t("questions.points")}</Badge>
                    <Badge variant={row.answer?.is_correct === true ? "default" : row.answer?.is_correct === false ? "destructive" : "outline"}>
                      {row.answer?.is_correct === true ? t("exams.isCorrect") :
                       row.answer?.is_correct === false ? "✗" :
                       row.question.kind === "text" ? t("questions.kind.text") : "—"}
                    </Badge>
                  </div>
                  <p class="mb-3 whitespace-pre-wrap text-sm font-medium">{row.question.text}</p>

                  <Show
                    when={row.question.kind === "choice"}
                    fallback={
                      <div class="rounded-sm bg-muted/40 p-3">
                        <p class="text-xs text-muted-foreground">{t("exams.textAnswer")}</p>
                        <p class="mt-1 whitespace-pre-wrap text-sm">{row.answer?.text || "—"}</p>
                      </div>
                    }
                  >
                    <div class="space-y-1.5">
                      <For each={row.question.choices}>
                        {(choice, ci) => (
                          <div
                            class={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                              ci() === row.question.correct && ci() === row.answer?.selected
                                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                : ci() === row.question.correct
                                  ? "border-green-300 bg-green-50/50 dark:bg-green-950/20"
                                  : ci() === row.answer?.selected
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border"
                            }`}
                          >
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border text-[11px] font-medium">
                              {ci() === row.question.correct || ci() === row.answer?.selected
                                ? ci() === row.question.correct
                                  ? "✓"
                                  : "✗"
                                : String.fromCharCode(65 + ci())}
                            </span>
                            <span>{choice}</span>
                            {ci() === row.question.correct && <Badge variant="outline" class="ml-auto text-[10px]">{t("questions.correct")}</Badge>}
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
