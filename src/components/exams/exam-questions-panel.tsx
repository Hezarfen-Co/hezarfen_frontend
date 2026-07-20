import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamChoiceImage } from "@/api/deleteExamChoiceImage";
import { deleteExamQuestionImage } from "@/api/deleteExamQuestionImage";
import { deleteExamQuestionById } from "@/api/deleteExamQuestionById";
import { getCourseSubjects } from "@/api/getCourseSubjects";
import { getExamQuestions } from "@/api/getExamQuestions";
import { patchExamQuestionById } from "@/api/patchExamQuestionById";
import { postExamChoiceImage } from "@/api/postExamChoiceImage";
import { postExamQuestionImage } from "@/api/postExamQuestionImage";
import { postExamQuestion } from "@/api/postExamQuestion";
import { ApiError, formatApiError } from "@/api/client";
import type { ExamQuestion } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { useT } from "@/stores/preferences-context";

const QUESTION_PAGE_SIZE = 5;

export function ExamQuestionsPanel(props: { examId: string; courseId: string; readOnly?: boolean; embedded?: boolean; createOpen?: boolean; onCreateOpenChange?: (open: boolean) => void }) {
  const t = useT();
  const [subjects] = createResource(() => props.courseId, async (courseId) => (await getCourseSubjects(courseId)).items);
  const [questions, { refetch }] = createResource(() => props.examId, async (examId) => {
    try {
      return (await getExamQuestions(examId)).items;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return [];
      throw err;
    }
  });
  const [showForm, setShowForm] = createSignal(false);
  const [editing, setEditing] = createSignal<ExamQuestion | null>(null);
  const [removeQuestion, setRemoveQuestion] = createSignal<ExamQuestion | null>(null);
  const [error, setError] = createSignal("");
  const [imagePending, setImagePending] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [page, setPage] = createSignal(0);
  const formOpen = () => props.createOpen ?? showForm();
  const setFormOpen = (open: boolean) => {
    props.onCreateOpenChange?.(open);
    setShowForm(open);
  };

  const formInitial = createMemo(() => editing() ?? undefined);
  const questionList = createMemo(() => questions() ?? []);
  const subjectName = (subjectId: string) => subjects()?.find((subject) => subject.id === subjectId)?.name ?? subjectId;
  const totalPages = createMemo(() => Math.max(1, Math.ceil(questionList().length / QUESTION_PAGE_SIZE)));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const pageItems = createMemo(() => {
    const start = safePage() * QUESTION_PAGE_SIZE;
    return questionList().slice(start, start + QUESTION_PAGE_SIZE);
  });

  createEffect(() => {
    if (!props.readOnly) return;
    setEditing(null);
    setFormOpen(false);
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
      const { image, choice_images, ...body } = values;
      const saved = q
        ? await patchExamQuestionById(props.examId, q.id, body)
        : await postExamQuestion(props.examId, body);
      if (image) await postExamQuestionImage(props.examId, saved.id, image);
      for (const [index, file] of (choice_images ?? []).entries()) {
        if (file) await postExamChoiceImage(props.examId, saved.id, index, file);
      }
      if (q) {
        setFlash(t("common.saved"));
      } else {
        setFlash(t("common.created"));
      }
      setEditing(null);
      setFormOpen(false);
      await refetch();
      if (isNewQuestion) setPage(Math.max(0, Math.ceil(questionList().length / QUESTION_PAGE_SIZE) - 1));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const removeQuestionImage = async (question: ExamQuestion) => {
    if (props.readOnly) return;
    setError("");
    setImagePending(`${question.id}:question`);
    try {
      await deleteExamQuestionImage(props.examId, question.id);
      await refetch();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setImagePending("");
    }
  };

  const removeChoiceImage = async (question: ExamQuestion, index: number) => {
    if (props.readOnly) return;
    setError("");
    setImagePending(`${question.id}:choice:${index}`);
    try {
      await deleteExamChoiceImage(props.examId, question.id, index);
      await refetch();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setImagePending("");
    }
  };

  return (
    <div class={props.embedded ? "space-y-4" : "surface-card space-y-4 p-5"}>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <Show when={!props.embedded}>
          <h2 class="font-display text-lg font-semibold">{t("questions.title")}</h2>
        </Show>
        <Show when={!props.readOnly && !props.embedded}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus class="h-4 w-4" />
            {t("questions.add")}
          </Button>
        </Show>
      </div>

      <FormDialog
        open={formOpen() || editing() != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
            setFormOpen(false);
          }
        }}
        title={editing() ? t("questions.edit") : t("questions.add")}
        description={t("questions.title")}
      >
        <QuestionForm
          initial={formInitial()}
          subjects={subjects() ?? []}
          onCancel={() => {
            setEditing(null);
            setFormOpen(false);
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
                          <Badge variant="secondary">{subjectName(q.subject)}</Badge>
                          <Badge variant="outline">{q.points} {t("questions.points")}</Badge>
                        </div>
                        <Show when={q.image}>
                          <img
                            src={`/api/exams/${props.examId}/questions/${q.id}/image`}
                            alt={t("questions.image")}
                            class="max-h-64 rounded-md border object-contain"
                          />
                        </Show>
                        <Show when={!props.readOnly && q.image}>
                          <Button type="button" variant="ghost" size="sm" class="h-8 w-fit text-destructive" disabled={imagePending() === `${q.id}:question`} onClick={() => void removeQuestionImage(q)}>
                            {t("common.delete")}
                          </Button>
                        </Show>
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
                                  <span class="min-w-0 flex-1 space-y-2 whitespace-pre-wrap">
                                    <span class="block">{choice}</span>
                                    <Show when={q.choice_images?.[choiceIndex()]}>
                                      <img
                                        src={`/api/exams/${props.examId}/questions/${q.id}/choices/${choiceIndex()}/image`}
                                        alt={t("questions.choiceImage")}
                                        class="max-h-40 rounded-md border object-contain"
                                      />
                                    </Show>
                                    <Show when={!props.readOnly && q.choice_images?.[choiceIndex()]}>
                                      <Button type="button" variant="ghost" size="sm" class="h-8 px-2 text-destructive" disabled={imagePending() === `${q.id}:choice:${choiceIndex()}`} onClick={() => void removeChoiceImage(q, choiceIndex())}>
                                        {t("common.delete")}
                                      </Button>
                                    </Show>
                                  </span>
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
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setRemoveQuestion(null);
          }
        }}
      />
    </div>
  );
}
