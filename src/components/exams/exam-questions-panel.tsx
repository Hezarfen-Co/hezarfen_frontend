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
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

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

  const formInitial = createMemo(() => editing() ?? undefined);

  createEffect(() => {
    if (!props.readOnly) return;
    setEditing(null);
    setShowForm(false);
    setRemoveQuestion(null);
  });

  const submit = async (values: QuestionValues) => {
    if (props.readOnly) return;
    setError("");
    try {
      const q = editing();
      if (q) {
        await patchExamQuestionById(props.examId, q.id, values);
      } else {
        await postExamQuestion(props.examId, values);
      }
      setEditing(null);
      setShowForm(false);
      await refetch();
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
              setShowForm((v) => !v);
            }}
          >
            <IconPlus class="h-4 w-4" />
            {t("questions.add")}
          </Button>
        </Show>
      </div>

      <Show when={showForm() || editing()}>
        <QuestionForm
          initial={formInitial()}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          onSubmit={submit}
        />
      </Show>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show
          when={(questions() ?? []).length > 0}
          fallback={<p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">{t("questions.empty")}</p>}
        >
          <ol class="space-y-3">
            <For each={questions() ?? []}>
              {(q, index) => (
                <li class="rounded-md border p-4">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="min-w-0 space-y-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-xs font-semibold text-muted-foreground">#{index() + 1}</span>
                        <Badge variant="outline" class="capitalize">
                          {q.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                        </Badge>
                        <Badge variant="outline">{q.points} {t("questions.points")}</Badge>
                      </div>
                      <p class="whitespace-pre-wrap text-sm font-medium">{q.text}</p>
                      <Show when={q.kind === "choice" && q.choices}>
                        <ol class="grid gap-1 text-sm text-muted-foreground">
                          <For each={q.choices ?? []}>
                            {(choice, choiceIndex) => (
                              <li class={choiceIndex() === q.correct ? "font-medium text-foreground" : undefined}>
                                {choiceIndex()}. {choice}
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
