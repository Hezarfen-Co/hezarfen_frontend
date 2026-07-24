import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteExamById } from "@/api/exams";
import { deleteExamResultByUserId } from "@/api/exams";
import { getExamById } from "@/api/exams";
import { getExamAttempt } from "@/api/exams";
import { getExamLive } from "@/api/exams";
import { getExamResult } from "@/api/exams";
import { getExamResults } from "@/api/exams";
import { getExamStatistics } from "@/api/exams";
import { getCourseEnrollments } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { patchExamById } from "@/api/exams";
import { postExamResult } from "@/api/exams";
import { ApiError, formatApiError } from "@/api/client";
import type { ExamResult } from "@/api/client";
import { ExamForm } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { AnswerSheetView } from "@/components/exams/answer-sheet-view";
import { ExamResultBadge } from "@/components/exams/exam-result-badge";
import { GradeForm } from "@/components/exams/grade-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronDown, IconChevronLeft, IconEdit, IconExam, IconEye, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { hasMinRole } from "@/lib/roles";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { examDisplayStatus, examStatusMessageKey, examStatusTone, isSittableExam, type ExamAttemptSummary, type ExamDisplayStatus } from "@/lib/exam-status";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { personId, personLabel, personLabelWithId } from "@/lib/person";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const RESULT_PAGE_SIZE = 10;

export default function ExamDetailPage() {
  return (
    <RouteGuard>
      <ExamDetailContent />
    </RouteGuard>
  );
}

function ExamDetailContent() {
  const location = useLocation();
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  // Keep the previous id while navigating away, so the resource does not
  // fetch the next page's path segment (e.g. GET /exams/exams) mid-transition.
  const id = createMemo((prev: string) => {
    const match = /^\/exams\/([^/]+)$/.exec(location().pathname);
    return match ? decodeURIComponent(match[1]) : prev;
  }, "");

  const [exam, { refetch: refetchExam }] = createResource(id, (examId) => getExamById(examId));
  const isStudent = createMemo(() => auth.user()?.role === "student");

  const hasCourseManagementRights = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };

  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeUserId, setRemoveUserId] = createSignal<string | null>(null);
  const [gradeOpen, setGradeOpen] = createSignal(false);
  const [resultPage, setResultPage] = createSignal(0);
  const [answerSheetUserId, setAnswerSheetUserId] = createSignal<string | null>(null);
  const answerSheetOpen = () => answerSheetUserId() != null;
  const [answerMark, setAnswerMark] = createSignal("0");
  const [answerError, setAnswerError] = createSignal("");
  const [answerPending, setAnswerPending] = createSignal(false);
  const [questionCreateOpen, setQuestionCreateOpen] = createSignal(false);
  const [examTab, setExamTab] = createSignal("schedule");
  const isSittable = () => {
    const e = exam();
    return e ? isSittableExam(e) : false;
  };

  const [ownResult] = createResource(
    () => (isStudent() ? id() : null),
    async (examId) => {
      if (!examId) return null;
      try {
        return await getExamResult(examId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );
  const [ownAttempt] = createResource(
    () => (isStudent() && isSittable() ? id() : null),
    async (examId) => {
      if (!examId) return null;
      try {
        return await getExamAttempt(examId);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 409)) return null;
        throw err;
      }
    },
  );

  const [results, { refetch: refetchResults }] = createResource(
    () => (hasCourseManagementRights() ? [id(), resultPage()] as const : null),
    async (source) => {
      if (!source) return { items: [], total: 0, limit: RESULT_PAGE_SIZE, offset: 0 };
      const [examId, page] = source;
      return getExamResults(examId, { limit: RESULT_PAGE_SIZE, offset: page * RESULT_PAGE_SIZE });
    },
  );
  const [gradeResults, { refetch: refetchGradeResults }] = createResource(
    () => (hasCourseManagementRights() && gradeOpen() ? id() : null),
    async (examId) => examId ? getExamResults(examId, { limit: 500, offset: 0 }) : null,
  );
  const [answerResult, { refetch: refetchAnswerResult }] = createResource(
    () => (hasCourseManagementRights() && answerSheetOpen() ? [id(), answerSheetUserId()!] as const : null),
    async (source) => {
      if (!source) return null;
      const [examId, userId] = source;
      const page = await getExamResults(examId, { limit: 500, offset: 0 });
      const row = page.items.find((item) => personId(item.user) === userId) ?? null;
      setAnswerMark(row ? String(row.mark) : "0");
      return row;
    },
  );
  const [stats] = createResource(
    () => (hasCourseManagementRights() ? id() : null),
    async (examId) => {
      if (!examId) return null;
      try {
        return await getExamStatistics(examId);
      } catch {
        return null;
      }
    },
  );
  const [roster] = createResource(
    () => (hasCourseManagementRights() && gradeOpen() ? exam()?.course ?? null : null),
    async (courseId) => (courseId ? (await getCourseEnrollments(courseId)).items : []),
  );
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses()).items : []),
  );

  const examStatus = () => {
    const e = exam();
    if (!e) return { finished: false, upcoming: false };
    const current = now();
    const finished = e.ends_at != null && e.ends_at < current;
    const upcoming = e.starts_at != null && e.starts_at > current;
    return { finished, upcoming };
  };
  const isFinished = () => examStatus().finished;
  const isUpcoming = () => examStatus().upcoming;
  const ownAttemptSummary = (): ExamAttemptSummary | null => {
    const attempt = ownAttempt();
    return attempt ? { status: attempt.status, attempts_used: attempt.attempts_used, max_attempts: attempt.max_attempts } : null;
  };
  const ownAttemptClosedByExit = () => {
    const attempt = ownAttempt();
    return !!attempt && attempt.status === "in_progress" && attempt.left_at != null;
  };
  const noAttemptsLeft = () => {
    const attempt = ownAttemptSummary();
    return detailStatus() === "no_attempts_left" || !!attempt && attempt.status !== "in_progress" && attempt.max_attempts > 0 && attempt.attempts_used >= attempt.max_attempts;
  };
  const detailStatus = (): ExamDisplayStatus => exam() ? examDisplayStatus(exam()!, now(), ownAttemptSummary()) : "unscheduled";
  const detailStatusLabel = () => {
    return t(examStatusMessageKey(detailStatus()));
  };

  const canManage = () => {
    if (isFinished()) return false;
    return hasCourseManagementRights();
  };

  const canViewExam = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    if (u.role !== "student") return true;
    return (mine() ?? []).some((course) => course.id === e.course);
  };
  const accessReady = () => auth.user()?.role !== "student" || mine() !== undefined;

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    if (mode === "open") return t("exams.mode.open");
    return t("exams.unscheduled");
  };
  const isDraft = () => exam()?.draft === true;
  const [gradeLive] = createResource(
    () => (hasCourseManagementRights() && gradeOpen() && !isFinished() ? id() : null),
    async (examId) => examId ? getExamLive(examId) : null,
  );
  const resultTotal = () => results()?.total ?? 0;
  const resultTotalPages = () => Math.max(1, Math.ceil(resultTotal() / RESULT_PAGE_SIZE));
  const setClampedAnswerMark = (value: string) => {
    if (value === "") {
      setAnswerMark(value);
      return;
    }
    const next = Math.max(0, Math.min(100, Number(value)));
    setAnswerMark(Number.isNaN(next) ? "" : String(Math.trunc(next)));
  };
  const submitAnswerMark = async (event: SubmitEvent) => {
    event.preventDefault();
    const userId = answerSheetUserId();
    if (!userId) return;
    const mark = Number(answerMark());
    if (!Number.isInteger(mark) || mark < 0 || mark > 100) {
      setAnswerError(t("form.markRange"));
      return;
    }
    setAnswerError("");
    setAnswerPending(true);
    try {
      await postExamResult(id(), { user_id: userId, mark });
      await refetchAnswerResult();
      await refetchResults();
      setFlash(t("common.saved"));
    } catch (err) {
      setAnswerError(formatApiError(err));
    } finally {
      setAnswerPending(false);
    }
  };
  createEffect(() => {
    if (resultPage() >= resultTotalPages()) setResultPage(resultTotalPages() - 1);
  });
  const gradeStudents = () => {
    if (gradeResults.loading) return [];
    const graded = new Set((gradeResults()?.items ?? []).map((row) => personId(row.user)));
    if (!isFinished()) {
      return (gradeLive()?.students ?? [])
        .filter((row) => (row.status === "submitted" || row.status === "expired") && !graded.has(personId(row.user)))
        .map((row) => ({
          id: personId(row.user),
          label: personLabelWithId(row.user),
        }));
    }
    return (roster() ?? [])
      .filter((row) => !graded.has(row.user.id))
      .map((row) => ({
        id: row.user.id,
        label: personLabelWithId(row.user),
      }));
  };
  const resultColumns = createMemo<ColumnDef<ExamResult>[]>(() => [
    {
      id: "user",
      accessorFn: (row) => personLabel(row.user),
      header: t("events.userId"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => personLabel(cell.row.original.user),
    },
    {
      accessorKey: "mark",
      header: t("form.mark"),
      cell: (cell) => <ExamResultBadge mark={cell.row.original.mark} />,
    },
    {
      id: "graded_by",
      accessorFn: (row) => personLabel(row.graded_by),
      header: t("exams.gradedBy"),
      meta: { cellClass: "text-sm text-muted-foreground" },
      cell: (cell) => personLabel(cell.row.original.graded_by),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("exams.answerSheet"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => setAnswerSheetUserId(personId(cell.row.original.user)),
            },
            {
              label: t("common.update"),
              icon: <IconEdit class="h-4 w-4" />,
              onSelect: () => setAnswerSheetUserId(personId(cell.row.original.user)),
            },
            ...(!isFinished()
              ? [{
                  label: t("common.remove"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setRemoveUserId(personId(cell.row.original.user)),
                }]
              : []),
          ]}
        />
      ),
    },
  ]);

  const [flash, setFlash] = createFlash();

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setError("");
    setPending(true);
    try {
      await fn();
      if (ok) setFlash(ok);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };
  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()?.id === id() ? exam() : undefined}
        fallback={
          <Show when={exam.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(exam.error)}</Alert>
          </Show>
        }
      >
        {(ex) => (
          <Show when={accessReady()} fallback={<PageSpinner />}>
            <Show when={canViewExam()} fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}>
          <div class="space-y-6">
            <div class="sticky top-14 z-10 -mx-4 bg-background px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <PageHeader
                accent="rose"
                eyebrow={t("exams.title")}
                title={ex().title}
                description={ex().description || "—"}
                actions={
                  <div class="detail-action-group">
                    <Link to="/exams">
                      <Button variant="ghost" size="sm" class="w-full rounded-xl sm:w-auto">
                        <IconChevronLeft class="h-4 w-4" />
                        {t("common.back")}
                      </Button>
                    </Link>
                    <Show when={isStudent() && !isDraft() && isSittable()}>
                      <Show when={!isUpcoming() && !isFinished()}>
                        <Show when={noAttemptsLeft()}
                          fallback={
                            <Link to="/exam-room/$id" params={{ id: id() }}>
                              <Button size="sm" class="flex-1 rounded-xl sm:flex-none">
                                <IconExam class="h-4 w-4" />
                                {ownAttempt()?.status === "in_progress" && !ownAttemptClosedByExit() ? t("attempt.resume") : t("attempt.openRoom")}
                              </Button>
                            </Link>
                          }
                        >
                          <Badge variant="secondary" class="flex-1 rounded-xl px-3 py-2 text-center sm:flex-none">
                            {ownAttempt()?.status === "submitted" ? t("attempt.submitted") : ownAttempt()?.status === "expired" ? t("attempt.expired") : t("attempt.noAttemptsLeft")}
                          </Badge>
                        </Show>
                      </Show>
                    </Show>
                    <Show when={hasCourseManagementRights() && !isDraft() && !isUpcoming() && isSittable()}>
                      <Link to="/exams/$id/live" params={{ id: id() }}>
                        <Button variant="outline" size="sm" class="flex-1 rounded-xl sm:flex-none">
                          <IconEye class="h-4 w-4" />
                          {isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
                        </Button>
                      </Link>
                    </Show>
                    <Show when={canManage()}>
                      <div class="detail-action-divider">
                        <Button type="button" variant="outline" size="sm" class="flex-1 rounded-xl sm:flex-none" onClick={() => setEditing(true)}>
                          <IconEdit class="h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                        <Button type="button" variant="destructive" size="sm" class="flex-1 rounded-xl sm:flex-none" disabled={pending()} onClick={() => setDeleteOpen(true)}>
                          <IconTrash class="h-4 w-4" />
                          {t("common.delete")}
                        </Button>
                      </div>
                    </Show>
                  </div>
                }
              />
            </div>
            <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("work.status")}</p>
                  <Badge
                    variant="outline"
                    class={cn(
                      "mt-2 w-fit rounded-full capitalize",
                      scheduleStatusClass(examStatusTone(detailStatus())),
                    )}
                  >
                    <span class={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(examStatusTone(detailStatus())))} />
                    {detailStatusLabel()}
                  </Badge>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.kind")}</p>
                  <p class="mt-1 font-medium capitalize">{examKindLabel(String(ex().kind), t)}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.mode")}</p>
                  <p class="mt-1 font-medium">{examModeLabel(ex().mode)}</p>
                </div>
                <div class="detail-metric-card">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.maxAttempts")}</p>
                  <p class="mono mt-1 font-medium tabular-nums">
                    <Show when={isStudent()} fallback={ex().max_attempts}>
                      {ownAttemptSummary() ? `${ownAttemptSummary()!.attempts_used} / ${ex().max_attempts}` : `0 / ${ex().max_attempts}`}
                      <span class="ml-1.5 text-xs text-muted-foreground font-sans tracking-normal">
                        ({t("exams.attemptsLeft")}: {ex().max_attempts - (ownAttemptSummary()?.attempts_used ?? 0)})
                      </span>
                    </Show>
                  </p>
                </div>
                <Show when={ex().starts_at}>
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.startsAt")}</p>
                    <p class="mono mt-1 font-medium tabular-nums">{formatDateTime(ex().starts_at, locale())}</p>
                  </div>
                </Show>
                <Show when={ex().ends_at}>
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.endsAt")}</p>
                    <p class="mono mt-1 font-medium tabular-nums">{formatDateTime(ex().ends_at, locale())}</p>
                  </div>
                </Show>
                <Show when={examDurationMs(ex().duration_ms, ex().starts_at, ex().ends_at)}>
                  {(dur) => (
                    <div class="detail-metric-card">
                      <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.durationMinutes")}</p>
                      <p class="mono mt-1 font-medium tabular-nums">{formatDurationMinutes(dur(), locale())}</p>
                    </div>
                  )}
                </Show>
              </div>

            <SidePanel
              open={answerSheetOpen()}
              onOpenChange={(open) => { if (!open) setAnswerSheetUserId(null); }}
              title={t("exams.answerSheet")}
              size="wide"
            >
              <Show when={answerSheetUserId()}>
                {(userId) => {
                  const [markOpen, setMarkOpen] = createSignal(false);
                  return (
                  <div class="space-y-4">
                    <button
                      type="button"
                      onClick={() => setMarkOpen((v) => !v)}
                      class="flex w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left text-sm shadow-xs transition-colors hover:bg-muted/40"
                    >
                      <span class="inline-flex items-center gap-2 font-medium">
                        <IconEdit class="h-4 w-4" />
                        <span>{t("form.mark")} {t("common.update")}</span>
                      </span>
                      <span class="inline-flex items-center gap-2">
                        <Show when={answerResult()}>
                          {(row) => <span class="tabular-nums font-semibold">{row().mark}/100</span>}
                        </Show>
                        <IconChevronDown class={cn("h-4 w-4 text-muted-foreground transition-transform", markOpen() && "rotate-180")} />
                      </span>
                    </button>
                    <Show when={markOpen()}>
                      <form class="space-y-3" onSubmit={submitAnswerMark}>
                        <div class="flex items-end gap-2">
                          <Input
                            id="answer-sheet-mark"
                            class="h-10 flex-1 rounded-lg"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={answerMark()}
                            onInput={(event) => setClampedAnswerMark(event.currentTarget.value)}
                          />
                          <span class="pb-2 text-sm text-muted-foreground">/ 100</span>
                          <Button type="submit" class="h-10 rounded-lg shrink-0" disabled={answerPending() || answerResult.loading}>
                            {t("common.save")}
                          </Button>
                        </div>
                        <Show when={answerError()}>
                          {(msg) => <p class="text-sm text-destructive">{msg()}</p>}
                        </Show>
                      </form>
                    </Show>
                    <AnswerSheetView examId={id()} userId={userId()} />
                  </div>
                  );
                }}
              </Show>
            </SidePanel>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.deleteExam", { title: ex().title })}
              onConfirm={async () => {
                await wrap(async () => {
                  await deleteExamById(id());
                  void navigate({ to: "/exams" });
                });
              }}
            />

            <SidePanel
              open={editing()}
              onOpenChange={setEditing}
              title={t("common.edit")}
              description={ex().title}
            >
              <ExamForm
                initial={ex()}
                submitLabel={t("common.update")}
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  await patchExamById(id(), values);
                  setEditing(false);
                  await refetchExam();
                  setFlash(t("common.saved"));
                }}
              />
            </SidePanel>

            <Show when={isStudent() && ownAttempt()?.status && (ownAttempt()!.status === "submitted" || ownAttempt()!.status === "expired")}>
              <Alert variant={ownAttempt()!.status === "submitted" ? "default" : "destructive"} class="border">
                <p class="text-sm font-medium">
                  {ownAttempt()!.status === "submitted" 
                    ? (noAttemptsLeft() ? t("attempt.submittedFinalInfo") : t("attempt.submittedCanRetakeInfo"))
                    : t("attempt.expiredInfo")}
                </p>
                <Show when={ownAttempt()?.finished_at}>
                  <p class="text-sm mt-1 opacity-80">
                    {t("attempt.submittedAt")}: {formatDateTime(ownAttempt()!.finished_at, locale())}
                  </p>
                </Show>
              </Alert>
            </Show>

            <Tabs value={examTab()} onChange={setExamTab} class="space-y-3">
              <TabsList>
                <TabsTrigger value="schedule">{t("exams.schedule")}</TabsTrigger>
                <Show when={isStudent() && ownResult()}>
                  <TabsTrigger value="ownResult">{t("exams.yourResult")}</TabsTrigger>
                </Show>
                <Show when={hasCourseManagementRights()}>
                  <TabsTrigger value="statistics">{t("exams.statistics")}</TabsTrigger>
                  <TabsTrigger value="questions">{t("questions.title")}</TabsTrigger>
                  <TabsTrigger value="results">{t("exams.results")}</TabsTrigger>
                </Show>
              </TabsList>

              <TabsContent value="schedule" forceMount>
                <div class="tab-panel-note mb-4">{t("exams.details")}</div>
                <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.mode")}</p>
                    <p class="mt-1 font-medium">{examModeLabel(ex().mode)}</p>
                  </div>
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.starts")}</p>
                    <p class="mono mt-1 font-medium">{formatDateTime(ex().starts_at, locale())}</p>
                  </div>
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("events.ends")}</p>
                    <p class="mono mt-1 font-medium">{formatDateTime(ex().ends_at, locale())}</p>
                  </div>
                  <div class="detail-metric-card">
                    <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.durationMinutes")}</p>
                    <p class="mono mt-1 font-medium">{formatDurationMinutes(examDurationMs(ex().duration_ms, ex().starts_at, ex().ends_at), locale())}</p>
                  </div>
                </div>
              </TabsContent>

              <Show when={isStudent() && ownResult()}>
                <TabsContent value="ownResult" forceMount>
                  <div class="tab-panel-note mb-4">{ownResult() ? `${t("form.mark")}: ${ownResult()!.mark}` : t("exams.notGraded")}</div>
                  <Suspense fallback={<PageSpinner />}>
                    <Show when={ownResult()} fallback={<ExamResultBadge notGraded />}>
                      {(r) => <ExamResultBadge mark={r().mark} />}
                    </Show>
                  </Suspense>
                  <Show when={ex().allow_review && ownResult()}>
                    <div class="mt-6">
                      <AnswerSheetView examId={id()} userId={auth.user()?.id ?? ""} mode="self" />
                    </div>
                  </Show>
                </TabsContent>
              </Show>

              <Show when={hasCourseManagementRights()}>
                <TabsContent value="statistics" forceMount>
                  <div class="tab-panel-note mb-4">{t("exams.examStatistics")}</div>
                  <Suspense fallback={<DataTableSkeleton columns={4} />}>
                    <Show when={stats()}>
                      {(s) => (
                        <div class="grid gap-3 text-sm sm:grid-cols-4">
                          <div class="detail-metric-card">
                            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.graded")}</p>
                            <p class="mono mt-1 text-2xl font-semibold tabular-nums">{s().graded}</p>
                          </div>
                          <div class="detail-metric-card">
                            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.average")}</p>
                            <p class="mono mt-1 text-2xl font-semibold tabular-nums">{s().average == null ? "—" : s().average}</p>
                          </div>
                          <div class="detail-metric-card">
                            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.min")}</p>
                            <p class="mono mt-1 text-2xl font-semibold tabular-nums">{s().min == null ? "—" : s().min}</p>
                          </div>
                          <div class="detail-metric-card">
                            <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("exams.max")}</p>
                            <p class="mono mt-1 text-2xl font-semibold tabular-nums">{s().max == null ? "—" : s().max}</p>
                          </div>
                        </div>
                      )}
                    </Show>
                  </Suspense>
                </TabsContent>

                <TabsContent value="questions" forceMount class="space-y-4">
                  <div class="tab-panel-header">
                    <p class="text-sm text-muted-foreground">{t("exams.examQuestions")}</p>
                    <Show when={hasCourseManagementRights() && !isFinished()}>
                      <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => { setExamTab("questions"); setQuestionCreateOpen(true); }}>
                        <IconPlus class="h-4 w-4" />
                        {t("questions.add")}
                      </Button>
                    </Show>
                  </div>
                  <ExamQuestionsPanel examId={id()} courseId={ex().course} readOnly={isFinished()} embedded createOpen={questionCreateOpen()} onCreateOpenChange={setQuestionCreateOpen} />
                </TabsContent>

              <SidePanel
                open={gradeOpen()}
                onOpenChange={setGradeOpen}
                title={t("exams.gradeStudent")}
              >
                <GradeForm
                  students={gradeStudents()}
                  onViewAnswers={(userId) => {
                    setGradeOpen(false);
                    setAnswerSheetUserId(userId);
                  }}
                  onSubmit={async (values) => {
                    await postExamResult(id(), values);
                    await refetchResults();
                    await refetchGradeResults();
                    setFlash(t("common.saved"));
                  }}
                />
              </SidePanel>

                <TabsContent value="results" forceMount class="space-y-4">
                  <div class="tab-panel-header">
                    <p class="text-sm text-muted-foreground">{`${resultTotal()} ${t("exams.studentResults")}`}</p>
                    <Button type="button" variant="outline" size="sm" class="rounded-lg" disabled={isDraft()} onClick={() => setGradeOpen(true)}>
                      <IconEdit class="h-4 w-4" />
                      {t("exams.gradeStudent")}
                    </Button>
                  </div>
                  <Suspense fallback={<PageSpinner />}>
                    <Show
                      when={(results()?.items ?? []).length > 0}
                      fallback={<EmptyState kind="exams" title={t("exams.noResults")} />}
                    >
                      <DataTable columns={resultColumns()} data={results()?.items ?? []} filterColumn="user" />
                      <Show when={resultTotal() > RESULT_PAGE_SIZE}>
                        <PaginationControls page={Math.min(resultPage(), resultTotalPages() - 1)} totalPages={resultTotalPages()} onPageChange={setResultPage} />
                      </Show>
                    </Show>
                  </Suspense>
                </TabsContent>
              </Show>
            </Tabs>

            <Show when={flash()}>
              <Alert variant="success">{flash()}</Alert>
            </Show>
            {error() && (
              <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <ConfirmDialog
              open={removeUserId() != null}
              onOpenChange={(open) => {
                if (!open) setRemoveUserId(null);
              }}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.removeResult", { user: removeUserId() ?? "" })}
              onConfirm={async () => {
                const userId = removeUserId();
                if (!userId) return;
                await wrap(async () => {
                  await deleteExamResultByUserId(id(), userId);
                  await refetchResults();
                }, t("common.deleted"));
                setRemoveUserId(null);
              }}
            />
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
