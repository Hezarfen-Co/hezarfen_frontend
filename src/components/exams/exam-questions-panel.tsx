import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamChoiceImage } from "@/api/exams";
import { deleteExamQuestionImage } from "@/api/exams";
import { deleteExamQuestionById } from "@/api/exams";
import { getCourseSubjects } from "@/api/courses";
import { getExamChoiceImageBlob } from "@/api/exams";
import { getExamQuestionImageBlob } from "@/api/exams";
import { getExamQuestions } from "@/api/exams";
import { postExamQuestionFromBank } from "@/api/exams";
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
import { BankQuestionPicker } from "@/components/exams/bank-question-picker";
import { QuestionForm, type QuestionValues } from "@/components/exams/question-form";
import { IconArchive, IconChevronLeft, IconChevronRight, IconPlus, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { planChoiceImageRestore } from "@/lib/choice-compaction";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
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
  // Older backends never write `source_bank` back onto the exam question after a
  // to-bank save, so remember what this session banked and treat both as "banked".
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
  const isBanked = (question: ExamQuestion) => Boolean(question.source_bank) || bankedIds().includes(question.id);
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
      // choice_sources is form-only bookkeeping — never send it to the backend.
      const { image, choice_images, choice_sources, ...body } = values;

      // A PATCH carrying `choices` wipes every stored option image, so pull the
      // ones the user kept first and put them back under their new indices.
      const lost: number[] = [];
      const keep: { index: number; file: File }[] = [];
      if (q && body.kind === "choice") {
        for (const slot of planChoiceImageRestore(choice_sources ?? [], q.choice_images ?? [], choice_images)) {
          try {
            const blob = await getExamChoiceImageBlob(props.examId, q.id, slot.source);
            keep.push({ index: slot.index, file: new File([blob], `choice-${slot.source}`, { type: blob.type }) });
          } catch {
            lost.push(slot.index); // the write below drops it either way — report it
          }
        }
      }

      const saved = q
        ? await patchExamQuestionById(props.examId, q.id, body)
        : await postExamQuestion(props.examId, body);
      if (image) await postExamQuestionImage(props.examId, saved.id, image);
      for (const [index, file] of (choice_images ?? []).entries()) {
        if (file) await postExamChoiceImage(props.examId, saved.id, index, file);
      }
      // Independent uploads: one failure must not strand the remaining images.
      for (const slot of keep) {
        try {
          await postExamChoiceImage(props.examId, saved.id, slot.index, slot.file);
        } catch {
          lost.push(slot.index);
        }
      }
      if (lost.length > 0) {
        setError(t("questions.imagesLost", {
          options: lost.sort((a, b) => a - b).map((index) => String.fromCharCode(65 + index)).join(", "),
        }));
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
    setBankOpen(false);
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

      <FormDialog
        open={bankOpen() && !props.readOnly}
        onOpenChange={setBankOpen}
        title={t("bank.pickTemplate")}
        description={t("bank.title")}
      >
        <BankQuestionPicker
          subjects={subjects() ?? []}
          onInsert={insertFromBank}
          onCancel={() => setBankOpen(false)}
        />
      </FormDialog>

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
          imageSrc={editing() ? `/api/exams/${props.examId}/questions/${editing()!.id}/image` : undefined}
          choiceImageSrc={(index) => `/api/exams/${props.examId}/questions/${editing()?.id}/choices/${index}/image`}
          loadImageBlob={editing() ? () => getExamQuestionImageBlob(props.examId, editing()!.id) : undefined}
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
                  <li class="rounded-lg border bg-card p-4 shadow-2xs">
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
                          {/* `source_bank` is set in both directions (inserted from the
                              bank, or saved to it), so the badge stays origin-neutral. */}
                          <Show when={isBanked(q)}>
                            <Badge variant="outline" class="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
                              <IconArchive class="h-3 w-3" />
                              {t("bank.inBankBadge")}
                            </Badge>
                          </Show>
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
                                  <span class="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border bg-background font-mono text-[11px] font-bold text-foreground shadow-2xs">
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
                              onClick={() => (isBanked(q) ? setConfirmBank(q) : void saveToBank(q))}
                            >
                              <IconArchive class="h-3.5 w-3.5" />
                              {isBanked(q) ? t("bank.saveCopyToBank") : t("bank.saveToBank")}
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
