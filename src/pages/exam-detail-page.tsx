import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamById } from "@/api/deleteExamById";
import { deleteExamResultByUserId } from "@/api/deleteExamResultByUserId";
import { getExamById } from "@/api/getExamById";
import { getExamResult } from "@/api/getExamResult";
import { getExamResults } from "@/api/getExamResults";
import { getExamStatistics } from "@/api/getExamStatistics";
import { getCourseEnrollments } from "@/api/getCourseEnrollments";
import { getMyCourses } from "@/api/getMyCourses";
import { getSettings } from "@/api/getSettings";
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
import { DataTableFrame } from "@/components/ui/data-table";
import { IconChevronLeft, IconEdit, IconExam, IconEye, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SectionDisclosure } from "@/components/ui/section-disclosure";
import { SidePanel } from "@/components/ui/side-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { hasMinRole } from "@/lib/roles";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { personId, personLabel, personLabelWithId } from "@/lib/person";
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
  const params = useParams({ from: "/exams/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  const [exam, { refetch: refetchExam }] = createResource(id, (examId) => getExamById(examId));
  const [settings] = createResource(() => getSettings());
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
  const [sheetUserId, setSheetUserId] = createSignal<string | null>(null);
  const [gradeOpen, setGradeOpen] = createSignal(false);
  const [openSections, setOpenSections] = createSignal({
    schedule: true,
    ownResult: false,
    answerSheet: false,
    statistics: false,
    questions: false,
    results: false,
  });

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

  const [results, { refetch: refetchResults }] = createResource(
    () => (hasCourseManagementRights() && (openSections().results || gradeOpen() || sheetUserId()) ? id() : null),
    async (examId) => {
      if (!examId) return [];
      return (await getExamResults(examId)).items;
    },
  );
  const [stats] = createResource(
    () => (hasCourseManagementRights() && openSections().statistics ? id() : null),
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
  const isSittable = () => exam()?.mode === "sync" || exam()?.mode === "async" || exam()?.mode === "open";
  const isScheduled = () => isSittable();
  const gradeStudents = () => {
    const graded = new Set((results() ?? []).map((row) => personId(row.user)));
    return (roster() ?? [])
      .filter((row) => !graded.has(row.user.id))
      .map((row) => ({
        id: row.user.id,
        label: personLabelWithId(row.user),
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
  const toggleSection = (section: "schedule" | "ownResult" | "answerSheet" | "statistics" | "questions" | "results") => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
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
            <div class="space-y-2">
              <div class="detail-breadcrumb">
                <span>{t("nav.group.classes")}</span>
                <span>/</span>
                <Link to="/exams">{t("exams.title")}</Link>
                <span>/</span>
                <span class="truncate">{ex().title}</span>
              </div>
              <PageHeader
                accent="rose"
                eyebrow={t("exams.title")}
                title={ex().title}
                description={ex().description || "—"}
                actions={
                  <div class="detail-action-group">
                  <Link to="/exams">
                    <Button variant="ghost" size="sm" class="w-full rounded-sm sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={isStudent() && !isFinished() && !isUpcoming() && isSittable()}>
                    <Link to="/exam-room/$id" params={{ id: id() }}>
                      <Button size="sm" class="flex-1 rounded-sm sm:flex-none">
                        <IconExam class="h-4 w-4" />
                        {t("attempt.openRoom")}
                      </Button>
                    </Link>
                  </Show>
                  <Show when={hasCourseManagementRights() && !isUpcoming() && isSittable()}>
                    <Link to="/exams/$id/live" params={{ id: id() }}>
                      <Button variant="outline" size="sm" class="flex-1 rounded-sm sm:flex-none">
                        <IconEye class="h-4 w-4" />
                        {isFinished() ? t("exams.finalState") : t("exams.liveMonitor")}
                      </Button>
                    </Link>
                  </Show>
                  <Show when={canManage()}>
                    <div class="detail-action-divider">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="flex-1 rounded-sm sm:flex-none"
                        onClick={() => setEditing(true)}
                      >
                        <IconEdit class="h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="flex-1 rounded-sm sm:flex-none"
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
                  !isScheduled() && "bg-muted text-muted-foreground border-muted",
                  isFinished() && "bg-muted text-muted-foreground border-muted",
                  isScheduled() && !isFinished() && !isUpcoming() && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                  isUpcoming() && "bg-amber-500/15 text-amber-600 border-amber-500/30",
                )}>
                  <span class={cn(
                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                    !isScheduled() && "bg-muted-foreground",
                    isFinished() && "bg-muted-foreground",
                    isScheduled() && !isFinished() && !isUpcoming() && "bg-emerald-600",
                    isUpcoming() && "bg-amber-600",
                  )} />
                  {!isScheduled() ? t("exams.unscheduled") : isFinished() ? t("exams.finished") : isUpcoming() ? t("exams.upcoming") : t("exams.active")}
                </Badge>
                <Badge variant="outline" class="rounded-sm capitalize">
                  {examKindLabel(String(ex().kind), t)}
                  <Show when={examWeight(ex(), settings()?.exam_kinds) != null}>
                    {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
                  </Show>
                </Badge>
                <Badge variant="outline" class="rounded-sm">
                  {examModeLabel(ex().mode)}
                </Badge>
              </div>
              </PageHeader>
            </div>

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
                }}
              />
            </SidePanel>

            <SectionDisclosure
              open={openSections().schedule}
              onToggle={() => toggleSection("schedule")}
              title={t("exams.schedule")}
              description={t("exams.details")}
            >
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
            </SectionDisclosure>

            <Show when={isStudent() && !isScheduled()}>
              <SectionDisclosure
                open={openSections().ownResult}
                onToggle={() => toggleSection("ownResult")}
                title={t("exams.yourResult")}
                description={ownResult() ? `${t("form.mark")}: ${ownResult()!.mark}` : t("exams.notGraded")}
              >
                <Suspense fallback={<PageSpinner />}>
                  <Show when={ownResult()} fallback={<ExamResultBadge notGraded />}>
                    {(r) => <ExamResultBadge mark={r().mark} />}
                  </Show>
                </Suspense>
              </SectionDisclosure>
            </Show>

            <Show when={hasCourseManagementRights() && sheetUserId()}>
              <SectionDisclosure
                open={openSections().answerSheet}
                onToggle={() => toggleSection("answerSheet")}
                title={t("exams.answerSheet")}
                description={sheetUserId() ?? undefined}
              >
                <Suspense fallback={<PageSpinner />}>
                  <AnswerSheetView examId={id()} userId={sheetUserId()!} />
                </Suspense>
              </SectionDisclosure>
            </Show>

            <Show when={hasCourseManagementRights()}>
              <SectionDisclosure open={openSections().statistics} onToggle={() => toggleSection("statistics")} title={t("exams.statistics")} description={t("exams.examStatistics")}>
                <Suspense fallback={<PageSpinner />}>
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
              </SectionDisclosure>

              <SectionDisclosure
                open={openSections().questions}
                onToggle={() => toggleSection("questions")}
                title={t("questions.title")}
                description={t("exams.examQuestions")}
              >
                <Show when={openSections().questions}>
                  <ExamQuestionsPanel examId={id()} readOnly={isFinished() || isUpcoming()} embedded />
                </Show>
              </SectionDisclosure>

              <SidePanel
                open={gradeOpen()}
                onOpenChange={setGradeOpen}
                title={t("exams.gradeStudent")}
              >
                <GradeForm
                  students={gradeStudents()}
                  onSubmit={async (values) => {
                    await postExamResult(id(), values);
                    await refetchResults();
                  }}
                />
              </SidePanel>

              <SectionDisclosure
                open={openSections().results}
                onToggle={() => toggleSection("results")}
                title={t("exams.results")}
                description={`${(results() ?? []).length} ${t("exams.studentResults")}`}
                actions={
                  <Show when={hasCourseManagementRights()}>
                    <div class="flex items-center gap-2">
                      <Show when={!isFinished()}>
                        <span class="text-xs text-muted-foreground">{t("exams.gradeAfterExam")}</span>
                      </Show>
                      <Button type="button" variant="outline" size="sm" class="rounded-lg" disabled={!isFinished()} onClick={() => setGradeOpen(true)}>
                        <IconEdit class="h-4 w-4" />
                        {t("exams.gradeStudent")}
                      </Button>
                    </div>
                  </Show>
                }
              >
                <Suspense fallback={<PageSpinner />}>
                  <Show
                    when={(results() ?? []).length > 0}
                    fallback={
                      <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.noResults")}
                      </p>
                    }
                  >
                    <DataTableFrame>
                      <Table class="data-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("events.userId")}</TableHead>
                            <TableHead>{t("form.mark")}</TableHead>
                            <TableHead>{t("exams.gradedBy")}</TableHead>
                            <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <For each={results() ?? []}>
                            {(row) => (
                              <TableRow>
                                <TableCell class="font-medium">{personLabel(row.user)}</TableCell>
                                <TableCell>
                                  <ExamResultBadge mark={row.mark} />
                                </TableCell>
                                <TableCell class="text-sm text-muted-foreground">{personLabel(row.graded_by)}</TableCell>
                                <TableCell class="px-1 text-center">
                                  <TableRowActions
                                    label={t("common.actions")}
                                    actions={[
                                      {
                                        label: t("exams.answerSheet"),
                                        icon: <IconEye class="h-4 w-4" />,
                                        onSelect: () => {
                                          const rowUserId = personId(row.user);
                                          setSheetUserId(sheetUserId() === rowUserId ? null : rowUserId);
                                        },
                                      },
                                      ...(!isFinished()
                                        ? [{
                                            label: t("common.remove"),
                                            icon: <IconTrash class="h-4 w-4" />,
                                            destructive: true,
                                            onSelect: () => setRemoveUserId(personId(row.user)),
                                          }]
                                        : []),
                                    ]}
                                  />
                                </TableCell>
                              </TableRow>
                            )}
                          </For>
                        </TableBody>
                      </Table>
                    </DataTableFrame>
                  </Show>
                </Suspense>
              </SectionDisclosure>
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
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
