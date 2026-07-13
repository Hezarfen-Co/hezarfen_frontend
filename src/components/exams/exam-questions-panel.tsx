import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamQuestionById } from "@/api/deleteExamQuestionById";
import { getExamQuestions } from "@/api/getExamQuestions";
import { patchExamQuestionById } from "@/api/patchExamQuestionById";
import { postExamQuestion } from "@/api/postExamQuestion";
import { ApiError, formatApiError } from "@/api/client";
import type { ExamQuestion } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

const QUESTION_PAGE_SIZE = 5;

export function ExamQuestionsPanel(props: { examId: string; readOnly?: boolean }) {
  const t = useT();
  const [questions, { refetch }] = createResource(() => props.examId, async (examId) => {
    try {
      return await getExamQuestions(examId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  });
  const [showForm, setShowForm] = createSignal(false);
  const [editing, setEditing] = createSignal<ExamQuestion | null>(null);
  const [removeQuestion, setRemoveQuestion] = createSignal<ExamQuestion | null>(null);
  const [error, setError] = createSignal("");
  const [page, setPage] = createSignal(0);

  const formInitial = createMemo(() => editing() ?? undefined);
  const questionList = createMemo(() => questions() ?? []);
  const totalPages = createMemo(() => Math.max(1, Math.ceil(questionList().length / QUESTION_PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const pageItems = createMemo(() => {
    const start = safePage() * QUESTION_PAGE_SIZE;
    return questionList().slice(start, start + QUESTION_PAGE_SIZE);
  });

  createEffect(() => {
    if (!props.readOnly) return;
    setEditing(null);
    setShowForm(false);
    setRemoveQuestion(null);
  });

  createEffect(() => {
    if (page() >= totalPages()) setPage(totalPages() - 1);
  });

  const submit = async (values: QuestionValues) => {
    if (props.readOnly) return;
    setError("");
    try {
      const q = editing();
      const isNewQuestion = !q;
      if (q) {
        await patchExamQuestionById(props.examId, q.id, values);
      } else {
        await postExamQuestion(props.examId, values);
      }
      setEditing(null);
      setShowForm(false);
      await refetch();
      if (isNewQuestion) setPage(Math.max(0, Math.ceil(questionList().length / QUESTION_PAGE_SIZE) - 1));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  return (
    <section class="surface-card space-y-4 p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="font-display text-lg font-semibold">{t("questions.title")}</h2>
        <Show when={!props.readOnly}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <IconPlus class="h-4 w-4" />
            {t("questions.add")}
          </Button>
        </Show>
      </div>

      <FormDialog
        open={showForm() || editing() != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setShowForm(false);
          }
        }}
        title={editing() ? t("questions.edit") : t("questions.add")}
        description={t("questions.title")}
      >
        <QuestionForm
          initial={formInitial()}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          onSubmit={submit}
        />
      </FormDialog>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show
          when={questionList().length > 0}
          fallback={<p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">{t("questions.empty")}</p>}
        >
          <div class="space-y-3">
            <ol class="space-y-3">
              <For each={pageItems()}>
                {(q, index) => (
                  <li class="rounded-md border p-4">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0 space-y-2">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-xs font-semibold text-muted-foreground">#{safePage() * QUESTION_PAGE_SIZE + index() + 1}</span>
                          <Badge variant="outline" class="capitalize">
                            {q.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                          </Badge>
                          <Badge variant="outline">{q.points} {t("questions.points")}</Badge>
                        </div>
                        <p class="whitespace-pre-wrap text-sm font-medium">{q.text}</p>
                        <Show when={q.kind === "choice" && q.choices}>
                          <ol class="grid gap-2 text-sm text-muted-foreground">
                            <For each={q.choices ?? []}>
                              {(choice, choiceIndex) => (
                                <li
                                  class={
                                    choiceIndex() === q.correct
                                      ? "flex items-start gap-3 rounded-sm bg-primary/10 px-3 py-2 font-medium text-foreground"
                                      : "flex items-start gap-3 rounded-sm bg-muted/30 px-3 py-2"
                                  }
                                >
                                  <span class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border bg-background text-[11px] font-semibold text-foreground">
                                    {String.fromCharCode(65 + choiceIndex())}
                                  </span>
                                  <span class="min-w-0 whitespace-pre-wrap">{choice}</span>
                                </li>
                              )}
                            </For>
                          </ol>
                        </Show>
                      </div>
                      <Show when={!props.readOnly}>
                        <div class="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(q)}>
                            {t("common.edit")}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" class="text-destructive" onClick={() => setRemoveQuestion(q)}>
                            <IconTrash class="h-4 w-4" />
                          </Button>
                        </div>
                      </Show>
                    </div>
                  </li>
                )}
              </For>
            </ol>

            <Show when={questionList().length > QUESTION_PAGE_SIZE}>
              <div class="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1"
                  disabled={safePage() <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <IconChevronLeft class="h-3.5 w-3.5" />
                  {t("common.prev")}
                </Button>
                <span class="text-xs tabular-nums text-muted-foreground">
                  {t("common.pageOf", { page: safePage() + 1, total: totalPages() })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1"
                  disabled={safePage() >= totalPages() - 1}
                  onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                >
                  {t("common.next")}
                  <IconChevronRight class="h-3.5 w-3.5" />
                </Button>
              </div>
            </Show>
          </div>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={removeQuestion() != null}
        onOpenChange={(open) => {
          if (!open) setRemoveQuestion(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={removeQuestion()?.text ?? ""}
        onConfirm={async () => {
          const q = removeQuestion();
          if (!q) return;
          setError("");
          try {
            await deleteExamQuestionById(props.examId, q.id);
            await refetch();
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setRemoveQuestion(null);
          }
        }}
      />
    </section>
  );
}
