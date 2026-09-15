import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamChoiceImage } from "@/api/exams";
import { deleteExamQuestionImage } from "@/api/exams";
import { deleteExamQuestionById } from "@/api/exams";
import { getCourseSubjects } from "@/api/courses";
import { getExamQuestionImageBlob } from "@/api/exams";
import { getExamQuestions } from "@/api/exams";
import { postExamQuestionFromBank } from "@/api/exams";
import { postExamQuestionRefreshFromBank } from "@/api/exams";
import { postExamQuestionToBank } from "@/api/exams";
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
import { SidePanel } from "@/components/ui/side-panel";
import { BankQuestionPicker } from "@/components/exams/bank-question-picker";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { IconArchive, IconChevronLeft, IconChevronRight, IconPlus, IconRefresh, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

/** Close after the current pointer gesture so the tap cannot reopen the surface. */
const closeAfterGesture = (close: () => void) => {
  setTimeout(close, 0);
};

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
  const auth = useAuth();
  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
  const [bankOpen, setBankOpen] = createSignal(false);
  const [banking, setBanking] = createSignal("");
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
  const [confirmBank, setConfirmBank] = createSignal<ExamQuestion | null>(null);
  const [confirmRefresh, setConfirmRefresh] = createSignal<ExamQuestion | null>(null);
  // The `banked_as` back-link only shows up after the refetch (and older backends
  // never write it at all), so remember what this session banked and treat both
  // as saved.
  const [bankedIds, setBankedIds] = createSignal<string[]>([]);
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
  // The header badge renders outside the <Suspense> below, so it must read
  // `.latest` — a bare read there re-suspends on every refetch (insert-from-bank,
  // save, delete) and blanks the surrounding page for the whole fetch.
  const questionCount = () => questions.latest?.length ?? 0;
  // Two separate links, never conflated: `banked_as` is set only by a save to the
  // bank, `from_bank` only by an insert out of it. A question added from the bank
  // has not been saved to it, so it must not offer "save another copy".
  const isSavedToBank = (question: ExamQuestion) => Boolean(question.banked_as) || bankedIds().includes(question.id);
  const isFromBank = (question: ExamQuestion) => Boolean(question.from_bank);
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
      // The saved choices come back in the submitted order, so the freshly picked
      // files line up with them — and every untouched option kept its own picture.
      for (const [index, file] of (choice_images ?? []).entries()) {
        const choiceId = saved.choices?.[index]?.id;
        if (file && choiceId) await postExamChoiceImage(props.examId, saved.id, choiceId, file);
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
      throw err;
    }
  };

  const insertFromBank = async (bankQuestionId: string, subjectId: string) => {
    await postExamQuestionFromBank(props.examId, bankQuestionId, subjectId);
    closeAfterGesture(() => setBankOpen(false));
    setFlash(t("bank.inserted"));
    await refetch();
  };

  const saveToBank = async (question: ExamQuestion) => {
    if (banking()) return;
    setError("");
    setBanking(question.id);
    try {
      await postExamQuestionToBank(props.examId, question.id);
      setBankedIds((ids) => (ids.includes(question.id) ? ids : [...ids, question.id]));
      setFlash(t("bank.savedToBank"));
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBanking("");
    }
  };

  // Re-copy the template over this question. Offered only while `from_bank` is
  // set: the bank delete cascade clears it, so a template that is gone takes the
  // action with it rather than leaving a button that can only fail.
  const refreshFromBank = async (question: ExamQuestion) => {
    if (banking()) return;
    setError("");
    setBanking(question.id);
    try {
      await postExamQuestionRefreshFromBank(props.examId, question.id);
      setFlash(t("bank.refreshed"));
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBanking("");
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

  const removeChoiceImage = async (question: ExamQuestion, choiceId: string) => {
    if (props.readOnly) return;
    setError("");
    setImagePending(`${question.id}:choice:${choiceId}`);
    try {
      await deleteExamChoiceImage(props.examId, question.id, choiceId);
      await refetch();
      setFlash(t("common.deleted"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setImagePending("");
    }
  };

  return (
    <div class={props.embedded ? "space-y-4" : "data-shell space-y-4 p-5"}>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>

      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border-hairline pb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-base font-semibold">{t("questions.title")}</h2>
          <Badge variant="secondary" class="font-mono text-xs">
            {questionCount()}
          </Badge>
        </div>
        <Show when={!props.readOnly}>
          <div class="flex flex-wrap items-center gap-1.5">
            <Show when={isTeacherPlus()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-8 gap-1.5 rounded-md text-xs font-semibold"
                onClick={() => setBankOpen(true)}
              >
                <IconArchive class="h-3.5 w-3.5" />
                {t("bank.fromBank")}
              </Button>
            </Show>
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
          </div>
        </Show>
      </div>

      <SidePanel
        open={bankOpen() && !props.readOnly}
        onOpenChange={(open) => {
          if (open) setBankOpen(true);
          else closeAfterGesture(() => setBankOpen(false));
        }}
        title={t("bank.pickTemplate")}
        description={t("bank.title")}
        size="wide"
      >
        <BankQuestionPicker
          subjects={subjects() ?? []}
          onInsert={insertFromBank}
          onCancel={() => closeAfterGesture(() => setBankOpen(false))}
        />
      </SidePanel>

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
          subjectsPending={subjects.loading}
          imageSrc={editing() ? `/api/exams/${props.examId}/questions/${editing()!.id}/image` : undefined}
          choiceImageSrc={(choiceId) => `/api/exams/${props.examId}/questions/${editing()?.id}/choices/${choiceId}/image`}
          loadImageBlob={editing() ? () => getExamQuestionImageBlob(props.examId, editing()!.id) : undefined}
          onCancel={() => {
            // In-body Cancel bypasses FormDialog's deferred onOpenChange, so
            // defer here too — otherwise the same tap can reopen the form.
            closeAfterGesture(() => {
              setEditing(null);
              setFormOpen(false);
            });
          }}
          onSubmit={submit}
        />
      </FormDialog>

      {error() && <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show
          when={questionList().length > 0}
          fallback={
            <div class="rounded-xl border border-dashed border-border-line bg-surface-overlay p-6 text-center">
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
                  <li class="rounded-xl border border-border-line bg-surface-base p-4">
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
                          {/* One badge per direction: a question can be both (added
                              from the bank, then saved back), so they stack. */}
                          <Show when={isFromBank(q)}>
                            <Badge variant="outline" class="gap-1 border-brand/40 text-brand">
                              <IconArchive class="h-3 w-3" />
                              {t("bank.fromBankBadge")}
                            </Badge>
                          </Show>
                          <Show when={isSavedToBank(q)}>
                            <Badge variant="outline" class="gap-1 border-warning/50 bg-warning/10 text-warning">
                              <IconArchive class="h-3 w-3" />
                              {t("bank.savedToBankBadge")}
                            </Badge>
                          </Show>
                        </div>
                        <Show when={q.image}>
                          <img
                            src={`/api/exams/${props.examId}/questions/${q.id}/image`}
                            alt={t("questions.image")}
                            class="h-56 w-full max-w-2xl rounded-md border border-border-line bg-surface-overlay object-contain"
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
                                    choice.id === q.correct
                                      ? "flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 font-medium text-foreground"
                                      : "flex items-start gap-3 rounded-md border border-border-hairline bg-surface-overlay px-3 py-2 text-muted-foreground"
                                  }
                                >
                                  <span class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border border-border-line bg-surface-base font-mono text-[11px] font-bold text-foreground">
                                    {String.fromCharCode(65 + choiceIndex())}
                                  </span>
                                  <span class="min-w-0 flex-1 space-y-2 whitespace-pre-wrap">
                                    <span class="block">{choice.text}</span>
                                    <Show when={q.choice_images?.[choiceIndex()]}>
                                      <img
                                        src={`/api/exams/${props.examId}/questions/${q.id}/choices/${choice.id}/image`}
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
                                        disabled={imagePending() === `${q.id}:choice:${choice.id}`}
                                        onClick={() => void removeChoiceImage(q, choice.id)}
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
                      {/* Saving to the bank copies the question out; it never touches the
                          exam, so it stays available on a finished/read-only exam. */}
                      <Show when={isTeacherPlus() || !props.readOnly}>
                        <div class="flex items-center gap-1.5">
                          <Show when={isTeacherPlus()}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-8 gap-1.5 px-2.5 text-xs"
                              disabled={banking() === q.id}
                              onClick={() => (isSavedToBank(q) ? setConfirmBank(q) : void saveToBank(q))}
                            >
                              <IconArchive class="h-3.5 w-3.5" />
                              {isSavedToBank(q) ? t("bank.saveCopyToBank") : t("bank.saveToBank")}
                            </Button>
                          </Show>
                          {/* Only while the question still points at a live
                              template: the bank delete cascade clears
                              `from_bank`, and the exam-side freeze is what
                              `readOnly` already reflects. */}
                          <Show when={!props.readOnly && isFromBank(q)}>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              class="h-8 gap-1.5 px-2.5 text-xs"
                              disabled={banking() === q.id}
                              onClick={() => setConfirmRefresh(q)}
                            >
                              <IconRefresh class="h-3.5 w-3.5" />
                              {t("bank.refresh")}
                            </Button>
                          </Show>
                          <Show when={!props.readOnly}>
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
                          </Show>
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
                class="h-8 gap-1 rounded-lg text-xs"
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
                class="h-8 gap-1 rounded-lg text-xs"
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
        open={confirmBank() != null}
        onOpenChange={(open) => {
          if (!open) setConfirmBank(null);
        }}
        title={t("bank.saveCopyTitle")}
        description={t("bank.saveCopyBody")}
        confirmLabel={t("bank.saveCopyConfirm")}
        icon={<IconArchive class="h-4 w-4" />}
        summary={confirmBank()?.text ?? ""}
        onConfirm={async () => {
          const q = confirmBank();
          if (!q) return;
          setConfirmBank(null);
          await saveToBank(q);
        }}
      />

      <ConfirmDialog
        open={confirmRefresh() != null}
        onOpenChange={(open) => {
          if (!open) setConfirmRefresh(null);
        }}
        title={t("bank.refreshTitle")}
        description={t("bank.refreshBody")}
        confirmLabel={t("bank.refreshConfirm")}
        icon={<IconRefresh class="h-4 w-4" />}
        summary={confirmRefresh()?.text ?? ""}
        onConfirm={async () => {
          const q = confirmRefresh();
          if (!q) return;
          setConfirmRefresh(null);
          await refreshFromBank(q);
        }}
      />

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
