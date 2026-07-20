import { For, Show, Suspense, createResource } from "solid-js";
import { ApiError } from "@/api/client";
import { getExamQuestions } from "@/api/getExamQuestions";
import { getStudentAnswers } from "@/api/getStudentAnswers";
import type { StudentAnswerSheet } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { IconCheck, IconX } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { cn } from "@/lib/cn";
import { joinAnswerSheet } from "@/lib/answer-sheet";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function AnswerSheetView(props: { examId: string; userId: string }) {
  const t = useT();
  const [data] = createResource(
    () => [props.examId, props.userId] as const,
    async ([examId, userId]) => {
      const questions = await getExamQuestions(examId);
      let sheet: StudentAnswerSheet;
      try {
        sheet = await getStudentAnswers(examId, userId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          sheet = {
            exam: examId,
            user: { id: userId, username: userId, display_name: null },
            answers: [],
            auto_score: { earned: 0, possible: 0 },
          };
        } else {
          throw err;
        }
      }
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
              <Show when={d().sheet.answers.length > 0} fallback={<Badge variant="outline">{t("exams.notStarted")}</Badge>}>
                <Badge variant="secondary">
                  {t("exams.autoScore")}: {d().sheet.auto_score.earned}/{d().sheet.auto_score.possible}
                </Badge>
              </Show>
            </div>

            <For each={d().rows}>
              {(row, idx) => (
                <div class="rounded-md border p-4">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <span class="text-xs font-semibold text-muted-foreground">#{idx() + 1}</span>
                    <Badge variant="outline">{row.question.points} {t("questions.points")}</Badge>
                    <Show when={row.answer?.is_correct != null}>
                      <Badge variant="outline" class={cn(
                        "size-[22px] p-0 flex items-center justify-center",
                        row.answer?.is_correct ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400" : "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-400",
                      )}>
                        <Show when={row.answer?.is_correct} fallback={<IconX class="h-3 w-3" />}>
                          <IconCheck class="h-3 w-3" />
                        </Show>
                      </Badge>
                    </Show>
                    <Show when={row.answer?.is_correct == null && row.question.kind === "text"}>
                      <Badge variant="outline" class="text-[10px]">{t("questions.kind.text")}</Badge>
                    </Show>
                    <Show when={row.answer?.is_correct == null && row.question.kind !== "text"}>
                      <span class="text-xs text-muted-foreground">—</span>
                    </Show>
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
                            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background text-[11px] font-semibold text-foreground">
                              {String.fromCharCode(65 + ci())}
                            </span>
                            <span>{choice}</span>
                            <Show when={ci() === row.answer?.selected && ci() !== row.question.correct}>
                              <Badge variant="destructive" class="ml-auto text-[10px]">✗</Badge>
                            </Show>
                            {ci() === row.question.correct && (
                              <Badge variant="outline" class="ml-auto border-green-300 bg-green-50 text-green-700 text-[10px] dark:border-green-700 dark:bg-green-950/30 dark:text-green-400">
                                <IconCheck class="h-3 w-3" />
                              </Badge>
                            )}
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
