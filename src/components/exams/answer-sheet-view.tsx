import { For, Show, Suspense, createMemo, createSignal, useTransition } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { ApiError } from "@/api/client";
import { getExamQuestions, getExamReviewQuestions } from "@/api/exams";
import { getStudentAnswers, getStudentAnswerImage } from "@/api/exams";
import { getStudentAttempts, getStudentAttemptAnswers, getStudentAttemptAnswerImage } from "@/api/exams";
import { getExamReviewAttempts, getExamReviewAttemptAnswers, getExamReviewAttemptAnswerImage } from "@/api/exams";
import type { StudentAnswerSheet } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconCheck, IconDownload, IconX } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { ReplayableImage } from "@/components/ui/replayable-image";
import { DropdownSelect } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { joinAnswerSheet } from "@/lib/answer-sheet";
import { personLabelWithId } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function AnswerSheetView(props: { examId: string; userId: string; mode?: "grader" | "self" }) {
  const t = useT();
  // "grader" hits the teacher, userId-scoped routes; "self" hits the self-scoped
  // /review routes (no userId in path). Everything below is identical either way.
  const mode = () => props.mode ?? "grader";

  // Self-review reads 409 while the caller's latest sitting is still in
  // progress — a retake must submit before it can read the answer key. We
  // degrade to a friendly banner instead of erroring the panel.
  const [reviewInProgress, setReviewInProgress] = createSignal(false);

  // Which sitting the grader is viewing. null = the latest (grade-of-record), the default.
  const [selectedSeq, setSelectedSeq] = createSignal<number | null>(null);
  // Switch sittings inside a transition so the current sheet stays on screen
  // while the next one loads — otherwise the `data` resource re-suspends and
  // the whole panel blanks to the PageSpinner on every pick.
  const [switching, startSwitch] = useTransition();

  // Attempt list + full mark history (oldest-first, index i = seq i+1). Both grader-only,
  // both tolerate "student never sat" by degrading to empty.
  const [attempts] = createResource(
    () => [props.examId, props.userId] as const,
    async ([examId, userId]) => {
      if (mode() === "self") setReviewInProgress(false);
      try {
        return mode() === "self" ? await getExamReviewAttempts(examId) : await getStudentAttempts(examId, userId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return [] as number[];
        if (mode() === "self" && err instanceof ApiError && err.status === 409) {
          setReviewInProgress(true);
          return [] as number[];
        }
        throw err;
      }
    },
  );
  const latestSeq = () => {
    const a = attempts();
    return a && a.length ? a[a.length - 1] : null;
  };
  // Effective seq being shown, and whether it's the current (re-gradable) sitting.
  const activeSeq = () => selectedSeq() ?? latestSeq();
  const isLatest = () => {
    const s = activeSeq();
    return s == null || s === latestSeq();
  };
  // Dropdown options, newest sitting first (a student may have many). Just the
  // sitting label; the latest is tagged as the current one. Per-sitting stats
  // live in the sheet header for the selected sitting, not in the dropdown.
  const attemptOptions = () =>
    [...(attempts() ?? [])].reverse().map((seq) => ({
      value: seq,
      label: `${t("exams.attemptN", { n: seq })}${seq === latestSeq() ? ` (${t("exams.currentAttempt")})` : ""}`,
    }));

  const answerImageUrl = (questionId: string) => {
    const seq = activeSeq();
    if (mode() === "self")
      return `/api/exams/${props.examId}/review/attempts/${seq}/answers/${questionId}/image`;
    return isLatest() || seq == null
      ? `/api/exams/${props.examId}/attempts/${props.userId}/answers/${questionId}/image`
      : `/api/exams/${props.examId}/students/${props.userId}/attempts/${seq}/answers/${questionId}/image`;
  };
  const fetchAnswerImage = (questionId: string) => {
    const seq = activeSeq();
    if (mode() === "self") return getExamReviewAttemptAnswerImage(props.examId, seq ?? 1, questionId);
    return isLatest() || seq == null
      ? getStudentAnswerImage(props.examId, props.userId, questionId)
      : getStudentAttemptAnswerImage(props.examId, props.userId, seq, questionId);
  };

  const [data] = createResource(
    // Re-fetch when the grader switches attempt. Latest uses the current-attempt route
    // (unchanged from before); an older seq uses the per-seq history route.
    () => [props.examId, props.userId, activeSeq(), isLatest()] as const,
    async ([examId, userId, seq, latest]) => {
      const questions = mode() === "self" ? await getExamReviewQuestions(examId) : await getExamQuestions(examId);
      let sheet: StudentAnswerSheet;
      try {
        if (mode() === "self") {
          if (seq == null) throw new ApiError(404, "no attempts");
          sheet = await getExamReviewAttemptAnswers(examId, seq);
        } else {
          sheet = latest || seq == null
            ? await getStudentAnswers(examId, userId)
            : await getStudentAttemptAnswers(examId, userId, seq);
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || (mode() === "self" && err.status === 409))) {
          if (mode() === "self" && err instanceof ApiError && err.status === 409) setReviewInProgress(true);
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

  // Per-sitting answer breakdown for the viewed attempt's header. `is_correct`
  // is only set for auto-gradable (choice) questions: right = got it, wrong =
  // missed it, empty = no answer given; answered text questions fall in none
  // (a human grades those). `pending` surfaces those so the counts stay honest.
  const sheetStats = createMemo(() => {
    const rows = data()?.rows ?? [];
    const answered = (a: (typeof rows)[number]["answer"]) =>
      !!a && (a.selected != null || !!a.text || !!a.answer_image);
    let right = 0;
    let wrong = 0;
    let empty = 0;
    let pending = 0;
    for (const r of rows) {
      if (!answered(r.answer)) empty++;
      else if (r.answer?.is_correct === true) right++;
      else if (r.answer?.is_correct === false) wrong++;
      else pending++;
    }
    return { right, wrong, empty, pending, total: rows.length };
  });

  return (
    // The picker stays OUTSIDE the Suspense: switching attempts re-fetches
    // `data`, and if the dropdown lived inside the suspending subtree it would
    // unmount and its portalled menu would flash unpositioned (top-left) on
    // every select. Only the answer sheet suspends.
    <div class="space-y-4">
      <Show when={reviewInProgress()}>
        <p class="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">{t("exams.reviewInProgress")}</p>
      </Show>
      <Show when={(attempts() ?? []).length > 1}>
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-muted-foreground">{t("exams.previousAttempts")}</span>
          <DropdownSelect
            options={attemptOptions()}
            value={activeSeq() ?? 0}
            onChange={(v) => startSwitch(() => setSelectedSeq(v))}
            triggerClass="w-full sm:w-auto"
          />
        </div>
      </Show>
      <Suspense fallback={<PageSpinner />}>
      <Show when={!reviewInProgress() && data()}>
        {(d) => (
          <div class={cn("space-y-4 transition-opacity", switching() && "opacity-60")}>
            <Show when={!isLatest()}>
              <p class="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{t("exams.pastAttemptReadOnly")}</p>
            </Show>
            <div class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-4 py-3">
              <p class="text-sm font-medium">{personLabelWithId(d().sheet.user)}</p>
              <Show when={d().sheet.answers.length > 0} fallback={<Badge variant="outline">{t("exams.notStarted")}</Badge>}>
                <div class="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" class="border-success/50 bg-success/10 text-success-text">
                    {t("exams.answersRight")}: {sheetStats().right}
                  </Badge>
                  <Badge variant="outline" class="border-destructive/50 bg-destructive/10 text-destructive-text">
                    {t("exams.answersWrong")}: {sheetStats().wrong}
                  </Badge>
                  <Badge variant="outline" class="text-muted-foreground">
                    {t("exams.answersEmpty")}: {sheetStats().empty}
                  </Badge>
                  <Show when={sheetStats().pending > 0}>
                    <Badge variant="outline" class="text-muted-foreground">
                      {t("exams.answersPending")}: {sheetStats().pending}
                    </Badge>
                  </Show>
                  <Badge variant="secondary">
                    {t("exams.autoScore")}: {d().sheet.auto_score.earned}/{d().sheet.auto_score.possible}
                  </Badge>
                </div>
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
                        row.answer?.is_correct ? "border-success/50 bg-success/10 text-success-text" : "border-destructive/50 bg-destructive/10 text-destructive-text",
                      )}>
                        <Show when={row.answer?.is_correct} fallback={<IconX class="h-3 w-3" />}>
                          <IconCheck class="h-3 w-3" />
                        </Show>
                      </Badge>
                    </Show>
                    <Show when={row.answer?.is_correct == null && row.question.kind === "text"}>
                      <Badge variant="outline" class="text-[11px]">{t("questions.kind.text")}</Badge>
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
                        <Show when={row.answer?.answer_image}>
                          <div class="mt-3 space-y-2">
                            <ReplayableImage
                              fetchBlob={() => fetchAnswerImage(row.question.id)}
                              src={answerImageUrl(row.question.id)}
                              alt={t("exams.drawAnswer")}
                              imgClass="h-64 w-full max-w-2xl rounded-md border bg-background object-contain"
                            />
                            <a href={answerImageUrl(row.question.id)} download={`answer-${idx() + 1}.png`}>
                              <Button type="button" size="sm" variant="outline" class="rounded-lg">
                                <IconDownload class="h-4 w-4" />
                                {t("notes.downloadFile")}
                              </Button>
                            </a>
                          </div>
                        </Show>
                      </div>
                    }
                  >
                    <div class="space-y-1.5">
                      <For each={row.question.choices}>
                        {(choice, ci) => (
                          <div
                            class={`flex items-center gap-2 rounded-sm border px-3 py-2 text-sm ${
                              choice.id === row.question.correct && choice.id === row.answer?.selected
                                ? "border-success bg-success/10"
                                : choice.id === row.question.correct
                                  ? "border-success/50 bg-success/5"
                                  : choice.id === row.answer?.selected
                                    ? "border-destructive bg-destructive/10"
                                    : "border-border"
                            }`}
                          >
                            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background text-[11px] font-semibold text-foreground">
                              {String.fromCharCode(65 + ci())}
                            </span>
                            <span>{choice.text}</span>
                            <Show when={choice.id === row.answer?.selected && choice.id !== row.question.correct}>
                              <Badge variant="destructive" class="ml-auto text-[11px]">✗</Badge>
                            </Show>
                            {choice.id === row.question.correct && (
                              <Badge variant="outline" class="ml-auto border-success/50 bg-success/10 text-success-text text-[11px]">
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
    </div>
  );
}
