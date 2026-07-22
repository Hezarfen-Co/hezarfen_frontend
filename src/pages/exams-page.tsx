import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { useNavigate } from "@tanstack/solid-router";
import { getCourseById } from "@/api/courses";
import { getCourses } from "@/api/courses";
import { getExams } from "@/api/exams";
import { getMyCourses } from "@/api/reports";
import { patchExamById } from "@/api/exams";
import { postCourseExam } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { Course, Exam } from "@/api/client";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconCheck, IconEdit, IconEye, IconPlus, IconRotateCcw } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { examDisplayStatus, examStatusMessageKey, examStatusTone, type ExamDisplayStatus } from "@/lib/exam-status";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EXAM_PAGE_SIZE = 12;

type ExamRow = Exam & { displayStatus: ExamDisplayStatus };

export default function ExamsPage() {
  return (
    <RouteGuard>
      <ExamsContent />
    </RouteGuard>
  );
}

function ExamsContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  const [statusFilter, setStatusFilter] = createSignal<ExamDisplayStatus | "all">("all");
  const [courseFilter, setCourseFilter] = createSignal("all");
  const [createOpen, setCreateOpen] = createSignal(false);
  const [selectedCourseId, setSelectedCourseId] = createSignal("");
  const [editingExam, setEditingExam] = createSignal<Exam | null>(null);
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const [createStep, setCreateStep] = createSignal<"details" | "questions">("details");
  const [createdExam, setCreatedExam] = createSignal<Exam | null>(null);
  const [editTab, setEditTab] = createSignal<"details" | "questions">("details");

  const [courses] = createResource(
    () => (auth.user()?.role && auth.user()?.role !== "student" ? true : null),
    async (enabled) => (enabled ? (await getCourses({ limit: 100 })).items : []),
  );
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses({ limit: 100 })).items : []),
  );

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const canEditExam = (exam: Exam) => exam.creator === auth.user()?.id || hasMinRole(auth.user()?.role, "manager");
  const visibleCourses = createMemo(() => (isStudent() ? mine() : courses()) ?? []);
  const manageableCourses = createMemo(() =>
    visibleCourses().filter((course) => course.creator.id === auth.user()?.id || hasMinRole(auth.user()?.role, "manager")),
  );
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher") && manageableCourses().length > 0;
  const [courseMap, setCourseMap] = createSignal<Record<string, string>>({});
  const courseTitle = (courseId: string) => {
    const cached = visibleCourses().find((c) => c.id === courseId);
    if (cached) return cached.title;
    return courseMap()[courseId] ?? courseId;
  };

  const examStatus = (exam: Exam) => examDisplayStatus(exam, now());

  const filterExams = (items: Exam[]) => {
    const allowed = isStudent() ? new Set(visibleCourses().map((course) => course.id)) : null;
    return items.filter((exam) => {
      if (allowed && !allowed.has(exam.course)) return false;
      if (statusFilter() !== "all" && examStatus(exam) !== statusFilter()) return false;
      if (courseFilter() !== "all" && exam.course !== courseFilter()) return false;
      return true;
    });
  };
  const searchExam = (exam: ExamRow, query: string) =>
    [exam.title, exam.description, courseTitle(exam.course), examKindLabel(String(exam.kind), t), statusLabel(exam.displayStatus)]
      .join(" ")
      .toLocaleLowerCase(locale())
      .includes(query.toLocaleLowerCase(locale()));

  const [list, { refetch: refetchExams }] = createResource(
    () => {
      if (isStudent() && mine() === undefined) return null;
      if (!isStudent() && courses() === undefined) return null;
      return [isStudent() ? "s" : "t", (mine() ?? []).map((c) => c.id).join(",")].join("|");
    },
    async () => {
      const items = (await getExams({ limit: 100 })).items;
      const known = new Map(visibleCourses().map((c) => [c.id, c.title]));
      const missing = [...new Set(items.map((e) => e.course))].filter((id) => !known.has(id));
      if (missing.length > 0) {
        await Promise.all(missing.map((id) =>
          getCourseById(id).then((c) => known.set(id, c.title)).catch(() => {}),
        ));
      }
      setCourseMap(Object.fromEntries(known));
      return items;
    },
  );

  createEffect(() => {
    if (!createOpen() || selectedCourseId()) return;
    setSelectedCourseId(manageableCourses()[0]?.id ?? "");
  });

  const openCreateModal = () => {
    setCreatedExam(null);
    setCreateStep("details");
    setCreateOpen(true);
  };

  const statusLabel = (status: ExamDisplayStatus) => {
    return t(examStatusMessageKey(status));
  };
  const rows = (): ExamRow[] => filterExams(list() ?? []).map((exam) => ({ ...exam, displayStatus: examStatus(exam) }));
  const columns = createMemo<ColumnDef<ExamRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("exams.title"),
      cell: (cell) => (
        <div class="min-w-0">
          <p class="truncate font-medium">{cell.row.original.title}</p>
          <p class="truncate text-xs text-muted-foreground">{cell.row.original.description || "—"}</p>
        </div>
      ),
    },
    {
      id: "course",
      accessorFn: (exam) => courseTitle(exam.course),
      header: t("nav.courses"),
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => courseTitle(cell.row.original.course),
    },
    {
      accessorKey: "starts_at",
      header: t("events.starts"),
      meta: { cellClass: "mono whitespace-nowrap text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.starts_at, locale()),
    },
    {
      id: "status",
      accessorFn: (exam) => statusLabel(exam.displayStatus),
      header: t("attempt.status"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => {
        const status = cell.row.original.displayStatus;
        return (
          <Badge variant="outline" class={cn("min-w-28 justify-center whitespace-nowrap rounded-sm", scheduleStatusClass(examStatusTone(status)))}>
            <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(examStatusTone(status)))} />
            {statusLabel(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "kind",
      header: t("exams.kind"),
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => examKindLabel(String(cell.row.original.kind), t),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => void navigate({ to: "/exams/$id", params: { id: cell.row.original.id } }),
            },
            ...(isTeacherPlus() && canEditExam(cell.row.original)
              ? [
                  ...(cell.row.original.draft
                    ? [{ label: t("exams.publish"), icon: <IconCheck class="h-4 w-4" />, disabled: pending(), onSelect: () => void publishExam(cell.row.original) }]
                    : []),
                  { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => { setEditingExam(cell.row.original); setEditTab("details"); } },
                ]
              : []),
          ]}
        />
      ),
    },
  ]);

  const saveOrCreateExam = async (values: ExamFormValues) => {
    const existing = createdExam();
    if (existing) {
      const updated = await patchExamById(existing.id, values);
      setCreatedExam(updated);
      await refetchExams();
      setCreateStep("questions");
      setFlash(t("common.saved"));
    } else {
      const courseId = selectedCourseId();
      if (!courseId) throw new Error(t("exams.selectCourse"));
      const newExam = await postCourseExam(courseId, {
        ...values,
        description: values.description.trim() || undefined,
      });
      setCreatedExam(newExam);
      await refetchExams();
      setCreateStep("questions");
      setFlash(t("common.created"));
    }
  };

  const updateExam = async (values: ExamFormValues) => {
    const exam = editingExam();
    if (!exam) return;
    const updated = await patchExamById(exam.id, values);
    setEditingExam(updated);
    await refetchExams();
    setFlash(t("common.saved"));
  };

  const publishExam = async (exam: Exam) => {
    setPending(true);
    setError("");
    try {
      await patchExamById(exam.id, { draft: false });
      await refetchExams();
      setFlash(t("exams.published"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader
          accent="rose"
          eyebrow={t("nav.exams")}
          title={t("exams.title")}
          description={t("exams.subtitle")}
          actions={
            canCreate() ? (
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={openCreateModal}>
                <IconPlus class="h-4 w-4" />
                {t("exams.create")}
              </Button>
            ) : undefined
          }
        />
      </div>

      <section class="data-shell space-y-4 p-4">
        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        <Show when={error()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <DataTable
            columns={columns()}
            data={rows()}
            tableClass="table-fixed min-w-[64rem]"
            filterPlaceholder={t("exams.searchPlaceholder")}
            searchPredicate={searchExam}
            enablePagination
            pageSize={EXAM_PAGE_SIZE}
            empty={t("exams.empty")}
            onRowClick={(exam) => void navigate({ to: "/exams/$id", params: { id: exam.id } })}
            filters={
              <div class="flex flex-wrap items-center gap-2.5">
                <div class="flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-card px-3 py-1.5 text-xs shadow-sm">
                  <span class="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">{t("attempt.status")}:</span>
                  <select
                    class="bg-transparent font-medium text-foreground outline-none cursor-pointer text-xs"
                    value={statusFilter()}
                    onChange={(event) => setStatusFilter(event.currentTarget.value as ExamDisplayStatus | "all")}
                  >
                    <option value="all">{t("common.all")}</option>
                    <option value="active">{t("exams.active")}</option>
                    <option value="upcoming">{t("exams.upcoming")}</option>
                    <option value="submitted">{t("attempt.submitted")}</option>
                    <option value="expired">{t("attempt.expired")}</option>
                    <option value="draft">{t("exams.draft")}</option>
                    <option value="finished">{t("exams.finished")}</option>
                    <option value="unscheduled">{t("exams.unscheduled")}</option>
                  </select>
                </div>

                <div class="flex h-11 items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.12] bg-card px-3 py-1.5 text-xs shadow-sm">
                  <span class="font-semibold uppercase tracking-wider text-muted-foreground text-[11px]">{t("nav.courses")}:</span>
                  <select
                    class="max-w-[12rem] truncate bg-transparent font-medium text-foreground outline-none cursor-pointer text-xs"
                    value={courseFilter()}
                    onChange={(event) => setCourseFilter(event.currentTarget.value)}
                  >
                    <option value="all">{t("common.all")}</option>
                    <For each={visibleCourses()}>{(course) => <option value={course.id}>{course.title}</option>}</For>
                  </select>
                </div>

                <Show when={statusFilter() !== "all" || courseFilter() !== "all"}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-11 rounded-xl px-3 text-xs font-medium text-muted-foreground hover:text-foreground tactile-press"
                    onClick={() => {
                      setStatusFilter("all");
                      setCourseFilter("all");
                    }}
                  >
                    <IconRotateCcw class="h-3.5 w-3.5 mr-1" />
                    {t("common.resetFilters")}
                  </Button>
                </Show>
              </div>
            }
          />
        </Suspense>
      </section>

      <SidePanel
        open={createOpen()}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreatedExam(null);
            setCreateStep("details");
          }
        }}
        title={createdExam() ? createdExam()!.title : t("exams.create")}
        description={createdExam() ? t("exams.step2Questions") : t("exams.subtitle")}
        size={createStep() === "questions" ? "wide" : "default"}
      >
        <div class="mb-4 flex border-b border-border/60 pb-2">
          <button
            type="button"
            class={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
              createStep() === "details"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted/50",
            )}
            onClick={() => setCreateStep("details")}
          >
            {t("exams.step1Details")}
          </button>
          <button
            type="button"
            disabled={!createdExam()}
            class={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
              createStep() === "questions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : createdExam()
                ? "text-muted-foreground hover:bg-muted/50"
                : "opacity-40 cursor-not-allowed text-muted-foreground",
            )}
            onClick={() => createdExam() && setCreateStep("questions")}
          >
            {t("exams.step2Questions")}
          </button>
        </div>

        <Show when={createStep() === "details"}>
          <Show when={!createdExam()}>
            <div class="mb-4 space-y-1.5">
              <label class="text-sm font-medium" for="exam-course">
                {t("exams.selectCourse")}
              </label>
              <Select id="exam-course" class="rounded-sm" value={selectedCourseId()} required onChange={(event) => setSelectedCourseId(event.currentTarget.value)}>
                <option value="">{t("exams.selectCourse")}</option>
                <For each={manageableCourses()}>{(course: Course) => <option value={course.id}>{course.title}</option>}</For>
              </Select>
            </div>
          </Show>
          <ExamForm
            initial={createdExam() ?? undefined}
            submitLabel={createdExam() ? t("common.update") : t("exams.nextQuestions")}
            onCancel={() => setCreateOpen(false)}
            onSubmit={saveOrCreateExam}
          />
        </Show>

        <Show when={createStep() === "questions" && createdExam()}>
          <div class="space-y-4">
            <ExamQuestionsPanel
              examId={createdExam()!.id}
              courseId={createdExam()!.course}
              embedded
            />
            <div class="flex justify-end border-t pt-3">
              <Button type="button" variant="default" onClick={() => setCreateOpen(false)}>
                {t("exams.finishAndClose")}
              </Button>
            </div>
          </div>
        </Show>
      </SidePanel>

      <SidePanel
        open={editingExam() != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExam(null);
            setEditTab("details");
          }
        }}
        title={t("common.edit")}
        description={editingExam()?.title}
        size={editTab() === "questions" ? "wide" : "default"}
      >
        <Show when={editingExam()}>
          {(exam) => (
            <div class="space-y-4">
              <div class="flex border-b border-border/60 pb-2">
                <button
                  type="button"
                  class={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                    editTab() === "details"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setEditTab("details")}
                >
                  {t("exams.step1Details")}
                </button>
                <button
                  type="button"
                  class={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                    editTab() === "questions"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setEditTab("questions")}
                >
                  {t("exams.step2Questions")}
                </button>
              </div>

              <Show when={editTab() === "details"}>
                <ExamForm
                  initial={exam()}
                  submitLabel={t("common.update")}
                  onCancel={() => setEditingExam(null)}
                  onSubmit={updateExam}
                />
              </Show>

              <Show when={editTab() === "questions"}>
                <ExamQuestionsPanel
                  examId={exam().id}
                  courseId={exam().course}
                  embedded
                />
              </Show>
            </div>
          )}
        </Show>
      </SidePanel>
    </div>
  );
}
