import { Link, useLocation, useNavigate } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamById } from "@/api/deleteExamById";
import { deleteExamResultByUserId } from "@/api/deleteExamResultByUserId";
import { getExamById } from "@/api/getExamById";
import { getExamResult } from "@/api/getExamResult";
import { getExamResults } from "@/api/getExamResults";
import { getExamStatistics } from "@/api/getExamStatistics";
import { getCourseEnrollments } from "@/api/getCourseEnrollments";
import { patchExamById } from "@/api/patchExamById";
import { postExamResult } from "@/api/postExamResult";
import { ApiError, formatApiError } from "@/api/client";
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
import { IconChevronLeft, IconEdit, IconExam, IconEye, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasMinRole } from "@/lib/roles";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  const id = () => decodeURIComponent(location().pathname.split("/")[2] ?? "");

  const [exam, { refetch: refetchExam }] = createResource(id, (examId) => getExamById(examId));
  const isTeacherPlus = createMemo(() => hasMinRole(auth.user()?.role, "teacher"));

  const [ownResult] = createResource(
    () => (!isTeacherPlus() ? id() : null),
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

  const [results, { refetch: refetchResults }] = createResource(
    () => (isTeacherPlus() ? id() : null),
    async (examId) => {
      if (!examId) return [];
      return getExamResults(examId);
    },
  );
  const [stats] = createResource(
    () => (isTeacherPlus() ? id() : null),
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
    () => (isTeacherPlus() ? exam()?.course ?? null : null),
    async (courseId) => (courseId ? getCourseEnrollments(courseId) : []),
  );

  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeUserId, setRemoveUserId] = createSignal<string | null>(null);
  const [sheetUserId, setSheetUserId] = createSignal<string | null>(null);

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

  const canManage = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    if (isFinished()) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };
  const isScheduled = () => exam()?.mode === "sync" || exam()?.mode === "async";
  const gradeStudents = () => {
    const graded = new Set((results() ?? []).map((row) => row.user));
    return (roster() ?? [])
      .filter((row) => !graded.has(row.user.id))
      .map((row) => ({
        id: row.user.id,
        label: `${row.user.display_name || row.user.username} · ${row.user.id}`,
      }));
  };

  const wrap = async (fn: () => Promise<void>) => {
    setError("");
    setPending(true);
    try {
      await fn();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()}
        fallback={
          <Show when={exam.error}>
            <Alert variant="destructive">
              {exam.error instanceof ApiError ? exam.error.message : t("common.notFound")}
            </Alert>
          </Show>
        }
      >
        {(ex) => (
          <div class="space-y-6">
            <PageHeader
              accent="rose"
              eyebrow={t("exams.title")}
              title={ex().title}
              description={ex().description || "—"}
              actions={
                <div class="flex flex-wrap items-center gap-1 rounded-md border bg-background/70 p-1 shadow-sm">
                  <Link to="/exams">
                    <Button variant="ghost" size="sm" class="rounded-sm">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={!isFinished() && !isUpcoming() && (ex().mode === "sync" || ex().mode === "async")}>
                    <Link to="/exam-room/$id" params={{ id: id() }}>
                      <Button size="sm" class="rounded-sm">
                        <IconExam class="h-4 w-4" />
                        {t("attempt.openRoom")}
                      </Button>
                    </Link>
                  </Show>
                  <Show when={isTeacherPlus() && !isUpcoming() && (ex().mode === "sync" || ex().mode === "async")}>
                    <Link to="/exams/$id/live" params={{ id: id() }}>
                      <Button variant="outline" size="sm" class="rounded-sm">
                        <IconEye class="h-4 w-4" />
                        {isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
                      </Button>
                    </Link>
                  </Show>
                  <Show when={canManage()}>
                    <div class="ml-1 flex items-center gap-1 border-l border-border pl-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="rounded-sm"
                        onClick={() => setEditing((v) => !v)}
                      >
                        <IconEdit class="h-4 w-4" />
                        {editing() ? t("common.cancel") : t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending()}
                        onClick={() => setDeleteOpen(true)}
                      >
                        <IconTrash class="h-4 w-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </Show>
                </div>
              }
            >
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" class={cn(
                  "rounded-sm capitalize",
                  isFinished() && "bg-muted text-muted-foreground border-muted",
                  !isFinished() && !isUpcoming() && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                  isUpcoming() && "bg-amber-500/15 text-amber-600 border-amber-500/30",
                )}>
                  <span class={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                    isFinished() && "bg-muted-foreground",
                    !isFinished() && !isUpcoming() && "bg-emerald-600",
                    isUpcoming() && "bg-amber-600",
                  )} />
                  {isFinished() ? t("exams.finished") : isUpcoming() ? t("exams.upcoming") : t("exams.active")}
                </Badge>
                <Badge variant="outline" class="rounded-sm capitalize">
                  {examKindLabel(String(ex().kind), t)}
                </Badge>
                <Badge variant="outline" class="rounded-sm">
                  {t("courses.weight")}: {ex().weight}
                </Badge>
                <Badge variant="outline" class="rounded-sm">
                  {examModeLabel(ex().mode)}
                </Badge>
              </div>
            </PageHeader>

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

            <Show when={editing()}>
              <section class="surface-card max-w-3xl p-5">
                <ExamForm
                  initial={ex()}
                  submitLabel={t("common.update")}
                  onCancel={() => setEditing(false)}
                  onSubmit={async (values) => {
                    await patchExamById(id(), values);
                    setEditing(false);
                    await refetchExam();
                  }}
                />
              </section>
            </Show>

            <section class="surface-card p-5">
              <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.schedule")}</h2>
              <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("exams.mode")}</p>
                  <p class="mt-1 font-medium">{examModeLabel(ex().mode)}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("events.starts")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ex().starts_at, locale())}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("events.ends")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ex().ends_at, locale())}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("exams.durationMinutes")}</p>
                  <p class="mt-1 font-medium">{formatDurationMinutes(examDurationMs(ex().duration_ms, ex().starts_at, ex().ends_at), locale())}</p>
                </div>
              </div>
            </section>

            <Show when={!isTeacherPlus() && !isScheduled()}>
              <section class="surface-card p-6">
                <h2 class="font-display text-lg font-semibold">{t("exams.yourResult")}</h2>
                <div class="mt-4">
                  <Suspense fallback={<PageSpinner />}>
                    <Show when={ownResult()} fallback={<ExamResultBadge notGraded />}>
                      {(r) => <ExamResultBadge mark={r().mark} />}
                    </Show>
                  </Suspense>
                </div>
              </section>
            </Show>

            <Show when={isTeacherPlus() && sheetUserId()}>
              <section class="surface-card p-5">
                <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.answerSheet")} — {sheetUserId()}</h2>
                <Suspense fallback={<PageSpinner />}>
                  <AnswerSheetView examId={id()} userId={sheetUserId()!} />
                </Suspense>
              </section>
            </Show>

            <Show when={isTeacherPlus()}>
              <section class="surface-card p-5">
                <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.statistics")}</h2>
                <Suspense fallback={<PageSpinner />}>
                  <Show when={stats()}>
                    {(s) => (
                      <div class="grid gap-3 text-sm sm:grid-cols-4">
                        <div class="rounded-md border p-3">
                          <p class="text-xs text-muted-foreground">{t("exams.graded")}</p>
                          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{s().graded}</p>
                        </div>
                        <div class="rounded-md border p-3">
                          <p class="text-xs text-muted-foreground">{t("exams.average")}</p>
                          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{s().average == null ? "—" : s().average}</p>
                        </div>
                        <div class="rounded-md border p-3">
                          <p class="text-xs text-muted-foreground">{t("exams.min")}</p>
                          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{s().min == null ? "—" : s().min}</p>
                        </div>
                        <div class="rounded-md border p-3">
                          <p class="text-xs text-muted-foreground">{t("exams.max")}</p>
                          <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{s().max == null ? "—" : s().max}</p>
                        </div>
                      </div>
                    )}
                  </Show>
                </Suspense>
              </section>

              <ExamQuestionsPanel examId={id()} readOnly={isFinished() || isUpcoming()} />

              <Show when={!isFinished()}>
                <section class="surface-card p-5">
                  <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.gradeStudent")}</h2>
                  <GradeForm
                    students={gradeStudents()}
                    onSubmit={async (values) => {
                      await postExamResult(id(), values);
                      await refetchResults();
                    }}
                  />
                </section>
              </Show>

              <section class="surface-card p-5">
                <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.results")}</h2>
                <Suspense fallback={<PageSpinner />}>
                  <Show
                    when={(results() ?? []).length > 0}
                    fallback={
                      <p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                        {t("exams.noResults")}
                      </p>
                    }
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("events.userId")}</TableHead>
                          <TableHead>{t("form.mark")}</TableHead>
                          <TableHead>{t("exams.gradedBy")}</TableHead>
                          <TableHead>{t("exams.answerSheet")}</TableHead>
                          <Show when={!isFinished()}>
                            <TableHead class="w-24" />
                          </Show>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={results() ?? []}>
                          {(row) => (
                            <TableRow class="h-12">
                              <TableCell class="font-mono text-xs">{row.user}</TableCell>
                              <TableCell>
                                <ExamResultBadge mark={row.mark} />
                              </TableCell>
                              <TableCell class="font-mono text-xs">{row.graded_by}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  class="rounded-sm"
                                  onClick={() => setSheetUserId(sheetUserId() === row.user ? null : row.user)}
                                >
                                  <IconEye class="h-4 w-4" />
                                </Button>
                              </TableCell>
                              <Show when={!isFinished()}>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => setRemoveUserId(row.user)}
                                  >
                                    <IconTrash class="h-4 w-4" />
                                    {t("common.remove")}
                                  </Button>
                                </TableCell>
                              </Show>
                            </TableRow>
                          )}
                        </For>
                      </TableBody>
                    </Table>
                  </Show>
                </Suspense>
              </section>
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
                });
                setRemoveUserId(null);
              }}
            />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
