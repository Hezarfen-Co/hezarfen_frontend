import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import { getExamAttempt } from "@/api/getExamAttempt";
import { getExamAttemptQuestions } from "@/api/getExamAttemptQuestions";
import { postExamAttempt } from "@/api/postExamAttempt";
import { postExamAttemptAnswer } from "@/api/postExamAttemptAnswer";
import { postExamAttemptFinish } from "@/api/postExamAttemptFinish";
import { ApiError, formatApiError } from "@/api/client";
import type { AttemptQuestion, Exam, ExamAttempt } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

function formatRemaining(ms: number): string {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function StudentExamRoom(props: { exam: Exam; compact?: boolean }) {
  const t = useT();
  const [attempt, { refetch: refetchAttempt, mutate: setAttempt }] = createResource(
    () => props.exam.id,
    async (examId) => {
      try {
        return await getExamAttempt(examId);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) return null;
        throw err;
      }
    },
  );
  const [questions, { refetch: refetchQuestions }] = createResource(
    () => (attempt() ? props.exam.id : null),
    async (examId) => {
      if (!examId) return [];
      return getExamAttemptQuestions(examId);
    },
  );
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [finishOpen, setFinishOpen] = createSignal(false);
  const [remainingMs, setRemainingMs] = createSignal(0);
  const [roomOpen, setRoomOpen] = createSignal(false);
  const scheduled = createMemo(() => props.exam.mode === "sync" || props.exam.mode === "async");
  const canWrite = createMemo(() => attempt()?.status === "in_progress" && remainingMs() > 0);

  createEffect(() => {
    const current = attempt();
    const remaining = current?.remaining_ms ?? 0;
    setRemainingMs(remaining);
    if (!current || current.status !== "in_progress" || remaining <= 0) return;
    const startedAt = Date.now();
    const initial = remaining;
    const timer = window.setInterval(() => {
      setRemainingMs(Math.max(0, initial - (Date.now() - startedAt)));
    }, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  const start = async () => {
    setError("");
    setPending(true);
    try {
      const next = await postExamAttempt(props.exam.id);
      setAttempt(next);
      setRoomOpen(true);
      await refetchQuestions();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const saveAnswer = async (question: AttemptQuestion, value: string) => {
    setError("");
    setPending(true);
    try {
      if (question.kind === "choice") {
        await postExamAttemptAnswer(props.exam.id, { question_id: question.id, selected: Number(value) });
      } else {
        await postExamAttemptAnswer(props.exam.id, { question_id: question.id, text: value });
      }
      await refetchAttempt();
      await refetchQuestions();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const finish = async () => {
    setError("");
    setPending(true);
    try {
      const next = await postExamAttemptFinish(props.exam.id);
      setAttempt(next);
      await refetchQuestions();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section class={props.compact ? "space-y-5" : "surface-card space-y-4 p-5"}>
      <Show when={!roomOpen()}>
        <div class="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("attempt.title")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {props.exam.mode === "sync" ? t("exams.mode.sync") : props.exam.mode === "async" ? t("exams.mode.async") : t("attempt.unscheduled")}
            </p>
          </div>
          <Show when={scheduled()} fallback={<Badge variant="outline">{t("attempt.unscheduled")}</Badge>}>
            <Show
              when={attempt()}
              fallback={
                <Button type="button" disabled={pending()} onClick={() => void start()}>
                  {t("attempt.start")}
                </Button>
              }
            >
              <Button type="button" variant="outline" disabled={pending()} onClick={() => setRoomOpen(true)}>
                {t("attempt.resume")}
              </Button>
            </Show>
          </Show>
        </div>
      </Show>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>}

      <Suspense fallback={<PageSpinner />}>
        <Show when={scheduled()}>
          <Show when={attempt()} fallback={<p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">{t("attempt.notStarted")}</p>}>
            {(a) => <AttemptSummary attempt={a()} remainingMs={remainingMs()} />}
          </Show>
        </Show>

        <Show when={attempt() && roomOpen()}>
          <Show when={!canWrite()}>
            <p class="rounded-sm bg-muted/40 px-3 py-3 text-sm text-muted-foreground">{t("attempt.closed")}</p>
          </Show>
          <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_12rem] xl:grid-cols-[minmax(0,1fr)_13rem] 2xl:grid-cols-[minmax(0,1fr)_14rem]">
            <div class="grid auto-rows-fr items-stretch gap-4 2xl:grid-cols-2">
              <For each={questions() ?? []}>
                {(question, index) => (
                  <QuestionAnswerCard
                    index={index() + 1}
                    nextQuestionId={(questions() ?? [])[index() + 1]?.id}
                    question={question}
                    disabled={!canWrite() || pending()}
                    onSave={(value) => saveAnswer(question, value)}
                  />
                )}
              </For>
            </div>
            <aside class="surface-card sticky top-4 space-y-3 p-4">
              <h3 class="font-display text-sm font-semibold">{t("questions.title")}</h3>
              <div class="grid grid-cols-4 gap-2">
                <For each={questions() ?? []}>
                  {(question, index) => (
                    <a
                      href={`#question-${question.id}`}
                      class="inline-flex h-9 items-center justify-center rounded-sm border bg-background text-sm font-medium hover:bg-accent"
                    >
                      {index() + 1}
                    </a>
                  )}
                </For>
              </div>
              <Show when={canWrite()}>
                <Button type="button" variant="destructive" class="w-full" disabled={pending()} onClick={() => setFinishOpen(true)}>
                  {t("attempt.finish")}
                </Button>
              </Show>
            </aside>
          </div>
        </Show>
      </Suspense>

      <ConfirmDialog
        open={finishOpen()}
        onOpenChange={setFinishOpen}
        title={t("attempt.finish")}
        summary={props.exam.title}
        onConfirm={finish}
      />
    </section>
  );
}

function AttemptSummary(props: { attempt: ExamAttempt; remainingMs: number }) {
  const t = useT();
  const { locale } = usePreferences();
  const statusLabel = () => {
    if (props.attempt.status === "in_progress") return t("attempt.inProgress");
    if (props.attempt.status === "submitted") return t("attempt.submitted");
    if (props.attempt.status === "expired") return t("attempt.expired");
    return props.attempt.status;
  };
  return (
    <div class="grid auto-rows-fr gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
      <div class="h-full rounded-md border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.status")}</p>
        <p class="mt-1 font-medium">{statusLabel()}</p>
      </div>
      <div class="h-full rounded-md border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.remaining")}</p>
        <p class="mt-1 font-mono font-medium">{formatRemaining(props.remainingMs)}</p>
      </div>
      <div class="h-full rounded-md border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.progress")}</p>
        <p class="mt-1 font-medium">{props.attempt.answered} / {props.attempt.question_count}</p>
      </div>
      <div class="h-full rounded-md border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.deadline")}</p>
        <p class="mt-1 font-medium">{formatDateTime(props.attempt.deadline, locale())}</p>
      </div>
      <div class="h-full rounded-md border bg-background/60 p-3">
        <p class="text-xs text-muted-foreground">{t("attempt.serverNow")}</p>
        <p class="mt-1 font-medium">{formatDateTime(props.attempt.now, locale())}</p>
      </div>
      <Show when={props.attempt.mark != null}>
        <div class="h-full rounded-md border bg-background/60 p-3">
          <p class="text-xs text-muted-foreground">{t("attempt.mark")}</p>
          <p class="mt-1 font-medium">{props.attempt.mark}</p>
        </div>
      </Show>
    </div>
  );
}

function QuestionAnswerCard(props: {
  index: number;
  nextQuestionId?: string;
  question: AttemptQuestion;
  disabled: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [value, setValue] = createSignal(
    props.question.kind === "choice"
      ? props.question.answer?.selected != null
        ? String(props.question.answer.selected)
        : ""
      : props.question.answer?.text ?? "",
  );
  const [saved, setSaved] = createSignal(false);

  createEffect(() => {
    setValue(
      props.question.kind === "choice"
        ? props.question.answer?.selected != null
          ? String(props.question.answer.selected)
          : ""
        : props.question.answer?.text ?? "",
    );
    setSaved(false);
  });

  const save = async () => {
    await props.onSave(value());
    setSaved(true);
    if (props.nextQuestionId) {
      document.getElementById(`question-${props.nextQuestionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <article id={`question-${props.question.id}`} class="surface-card min-h-[18rem] scroll-mt-24 p-5">
      <div class="mb-3 flex flex-wrap items-center gap-2">
        <span class="text-xs font-semibold text-muted-foreground">#{props.index}</span>
        <Badge variant="outline">{props.question.points} {t("questions.points")}</Badge>
        <Show when={saved()}>
          <Badge variant="outline">{t("attempt.saved")}</Badge>
        </Show>
        <Show when={props.question.answer?.updated_at}>
          {(updatedAt) => <Badge variant="outline">{t("attempt.savedAt")}: {formatDateTime(updatedAt(), locale())}</Badge>}
        </Show>
      </div>
      <p class="mb-4 whitespace-pre-wrap text-sm font-medium">{props.question.text}</p>
      <Show
        when={props.question.kind === "choice"}
        fallback={
          <Textarea
            value={value()}
            rows={4}
            disabled={props.disabled}
            maxlength={10000}
            onInput={(e) => {
              setSaved(false);
              setValue(e.currentTarget.value);
            }}
          />
        }
      >
        <div class="space-y-2">
          <For each={props.question.choices ?? []}>
            {(choice, choiceIndex) => (
              <button
                type="button"
                class="flex w-full items-center gap-3 rounded-sm border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                disabled={props.disabled}
                onClick={() => {
                  setSaved(false);
                  setValue(String(choiceIndex()));
                }}
              >
                <span
                  class={
                    value() === String(choiceIndex())
                      ? "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-primary bg-primary"
                      : "h-4 w-4 shrink-0 rounded-[3px] border border-input bg-background"
                  }
                >
                  <span
                    class={value() === String(choiceIndex()) ? "h-2 w-2 rounded-[1px] bg-primary-foreground" : "hidden"}
                  />
                </span>
                <span>{choice}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
      <Button
        type="button"
        size="sm"
        class="mt-3"
        disabled={props.disabled || (props.question.kind === "choice" && value() === "")}
        onClick={() => void save()}
      >
        {t("attempt.saveAnswer")}
      </Button>
    </article>
  );
}
