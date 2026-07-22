import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamChoiceImage } from "@/api/exams";
import { deleteExamQuestionImage } from "@/api/exams";
import { deleteExamQuestionById } from "@/api/exams";
import { getCourseSubjects } from "@/api/courses";
import { getExamQuestions } from "@/api/exams";
import { patchExamQuestionById } from "@/api/exams";
import { postExamChoiceImage } from "@/api/exams";
import { postExamQuestionImage } from "@/api/exams";
import { postExamQuestion } from "@/api/exams";
import { ApiError, formatApiError } from "@/api/client";
import type { ExamQuestion } from "@/api/client";
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

const QUESTION_PAGE_SIZE = 1;

export function ExamQuestionsPanel(props: {
  examId: string;
  courseId: string;
  readOnly?: boolean;
  embedded?: boolean;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}) {
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

      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div class="flex items-center gap-2">
          <h2 class="font-display text-base font-semibold">{t("questions.title")}</h2>
          <Badge variant="secondary" class="rounded-full font-mono text-xs">
            {questionList().length}
          </Badge>
        </div>
        <Show when={!props.readOnly}>
          <Button
            type="button"
            variant="default"
            size="sm"
            class="h-8 gap-1.5 rounded-md text-xs font-semibold"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <IconPlus class="h-3.5 w-3.5" />
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
          fallback={
            <div class="rounded-lg border border-dashed p-6 text-center">
              <p class="text-sm text-muted-foreground">{t("questions.empty")}</p>
              <Show when={!props.readOnly}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="mt-3 gap-1.5"
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
          }
        >
          <div class="space-y-3">
            <ol class="space-y-3">
              <For each={pageItems()}>
                {(q, index) => (
                  <li class="rounded-lg border bg-card p-4 shadow-xs">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="min-w-0 flex-1 space-y-2.5">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-mono text-xs font-semibold text-muted-foreground">
                            #{safePage() * QUESTION_PAGE_SIZE + index() + 1}
                          </span>
                          <Badge variant="outline" class="capitalize">
                            {q.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                          </Badge>
                          <Badge variant="secondary">{subjectName(q.subject)}</Badge>
                          <Badge variant="outline" class="font-mono">
                            {q.points} {t("questions.points")}
                          </Badge>
                        </div>
                        <Show when={q.image}>
                          <img
                            src={`/api/exams/${props.examId}/questions/${q.id}/image`}
                            alt={t("questions.image")}
                            class="h-56 w-full max-w-2xl rounded-md border bg-muted/20 object-contain"
                          />
                        </Show>
                        <Show when={!props.readOnly && q.image}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="h-7 w-fit text-xs text-destructive"
                            disabled={imagePending() === `${q.id}:question`}
                            onClick={() => void removeQuestionImage(q)}
                          >
                            {t("common.delete")}
                          </Button>
                        </Show>
                        <p class="whitespace-pre-wrap text-sm font-medium leading-relaxed">{q.text}</p>
                        <Show when={q.kind === "choice" && q.choices}>
                          <ol class="grid gap-2 text-sm">
                            <For each={q.choices ?? []}>
                              {(choice, choiceIndex) => (
                                <li
                                  class={
                                    choiceIndex() === q.correct
                                      ? "flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium text-foreground"
                                      : "flex items-start gap-3 rounded-md border border-transparent bg-muted/30 px-3 py-2 text-muted-foreground"
                                  }
                                >
                                  <span class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border bg-background font-mono text-[11px] font-bold text-foreground shadow-xs">
                                    {String.fromCharCode(65 + choiceIndex())}
                                  </span>
                                  <span class="min-w-0 flex-1 space-y-2 whitespace-pre-wrap">
                                    <span class="block">{choice}</span>
                                    <Show when={q.choice_images?.[choiceIndex()]}>
                                      <img
                                        src={`/api/exams/${props.examId}/questions/${q.id}/choices/${choiceIndex()}/image`}
                                        alt={t("questions.choiceImage")}
                                        class="h-32 w-full max-w-md rounded-md border bg-background object-contain"
                                      />
                                    </Show>
                                    <Show when={!props.readOnly && q.choice_images?.[choiceIndex()]}>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        class="h-7 px-2 text-xs text-destructive"
                                        disabled={imagePending() === `${q.id}:choice:${choiceIndex()}`}
                                        onClick={() => void removeChoiceImage(q, choiceIndex())}
                                      >
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
                        <div class="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            class="h-8 px-2.5 text-xs"
                            onClick={() => setEditing(q)}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="h-8 w-8 p-0 text-destructive"
                            onClick={() => setRemoveQuestion(q)}
                          >
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
                  class="h-8 gap-1 text-xs"
                  disabled={safePage() <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <IconChevronLeft class="h-3.5 w-3.5" />
                  {t("common.prev")}
                </Button>
                <span class="font-mono text-xs tabular-nums text-muted-foreground">
                  {t("common.pageOf", { page: safePage() + 1, total: totalPages() })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1 text-xs"
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
