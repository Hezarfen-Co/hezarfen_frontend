import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { useNavigate } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getExamAttempt } from "@/api/getExamAttempt";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { patchExamById } from "@/api/patchExamById";
import { postCourseExam } from "@/api/postCourseExam";
import { formatApiError } from "@/api/client";
import type { AttemptStatus, Course, Exam } from "@/api/types";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEye, IconPlus } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EXAM_PAGE_SIZE = 12;

type ExamStatus = "draft" | "unscheduled" | "upcoming" | "active" | "finished" | "submitted" | "expired";
type ExamRow = Exam & { displayStatus: ExamStatus };

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
  const [statusFilter, setStatusFilter] = createSignal<ExamStatus | "all">("all");
  const [courseFilter, setCourseFilter] = createSignal("all");
  const [showMoreFilters, setShowMoreFilters] = createSignal(false);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [selectedCourseId, setSelectedCourseId] = createSignal("");
  const [editingExam, setEditingExam] = createSignal<Exam | null>(null);
  const [attemptStatuses, setAttemptStatuses] = createSignal<Record<string, AttemptStatus | "not_started">>({});
  const [flash, setFlash] = createFlash();

  const [courses] = createResource(
    () => (auth.user()?.role && auth.user()?.role !== "student" ? true : null),
    async (enabled) => (enabled ? (await getCourses()).items : []),
  );
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses()).items : []),
  );

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const canEditExam = (exam: Exam) => exam.creator === auth.user()?.id || hasMinRole(auth.user()?.role, "manager");
  const visibleCourses = createMemo(() => (isStudent() ? mine() : courses()) ?? []);
  const manageableCourses = createMemo(() =>
    visibleCourses().filter((course) => course.creator.id === auth.user()?.id || hasMinRole(auth.user()?.role, "manager")),
  );
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher") && manageableCourses().length > 0;
  const courseById = createMemo(() => new Map(visibleCourses().map((course) => [course.id, course])));
  const courseTitle = (courseId: string) => courseById().get(courseId)?.title ?? courseId;

  const isSittable = (exam: Exam) => exam.mode === "sync" || exam.mode === "async" || exam.mode === "open";
  const examStatus = (exam: Exam): ExamStatus => {
    const own = attemptStatuses()[exam.id];
    if (own === "submitted" || own === "expired") return own;
    if (exam.draft) return "draft";
    if (!isSittable(exam)) return "unscheduled";
    if (exam.mode === "open") return "active";
    const current = now();
    if (exam.ends_at != null && exam.ends_at < current) return "finished";
    if (exam.starts_at != null && exam.starts_at > current) return "upcoming";
    return "active";
  };

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
      // Do not track now() here — it ticks every second and would re-fetch forever.
      if (isStudent() && mine() === undefined) return null;
      return [isStudent() ? "s" : "t", (mine() ?? []).map((c) => c.id).join(",")].join("|");
    },
    async () => (await getExams()).items,
  );

  createEffect(() => {
    if (!createOpen() || selectedCourseId()) return;
    setSelectedCourseId(manageableCourses()[0]?.id ?? "");
  });

  const statusLabel = (status: ExamStatus) => {
    if (status === "submitted") return t("attempt.submitted");
    if (status === "expired") return t("attempt.expired");
    if (status === "draft") return t("exams.draft");
    if (status === "unscheduled") return t("exams.unscheduled");
    if (status === "finished") return t("exams.finished");
    if (status === "upcoming") return t("exams.upcoming");
    return t("exams.active");
  };
  const statusTone = (status: ExamStatus) => status === "expired" ? "finished" : status;

  const rows = (): ExamRow[] => filterExams(list() ?? []).map((exam) => ({ ...exam, displayStatus: examStatus(exam) }));
  createEffect(() => {
    if (!isStudent()) return;
    const exams = list();
    if (!exams) return;
    const allowed = new Set(visibleCourses().map((course) => course.id));
    const refresh = () => {
      for (const exam of exams) {
        if (!allowed.has(exam.course) || !isSittable(exam)) continue;
        const current = attemptStatuses()[exam.id];
        if (current === "submitted" || current === "expired") continue;
        if (current != null && current !== "in_progress") continue;
        void getExamAttempt(exam.id)
          .then((attempt) => {
            setAttemptStatuses((prev) => ({ ...prev, [exam.id]: attempt.status }));
          })
          .catch(() => {
            setAttemptStatuses((prev) => ({ ...prev, [exam.id]: "not_started" }));
          });
      }
    };
    refresh();
    const interval = window.setInterval(refresh, 5000);
    onCleanup(() => window.clearInterval(interval));
  });
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
          <Badge variant="outline" class={cn("w-28 justify-center rounded-sm", scheduleStatusClass(statusTone(status)))}>
            <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(statusTone(status)))} />
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
              ? [{ label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => setEditingExam(cell.row.original) }]
              : []),
          ]}
        />
      ),
    },
  ]);

  const createExam = async (values: ExamFormValues) => {
    const courseId = selectedCourseId();
    if (!courseId) throw new Error(t("exams.selectCourse"));
    await postCourseExam(courseId, {
      ...values,
      description: values.description.trim() || undefined,
    });
    setCreateOpen(false);
    await refetchExams();
    setFlash(t("common.created"));
  };

  const updateExam = async (values: ExamFormValues) => {
    const exam = editingExam();
    if (!exam) return;
    await patchExamById(exam.id, values);
    setEditingExam(null);
    await refetchExams();
    setFlash(t("common.saved"));
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
              <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
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
            filters={
              <>
                <Select class="h-9 w-full rounded-sm sm:w-40" value={statusFilter()} onChange={(event) => setStatusFilter(event.currentTarget.value as ExamStatus | "all")}>
                  <option value="all">{t("common.all")}</option>
                  <option value="submitted">{t("attempt.submitted")}</option>
                  <option value="expired">{t("attempt.expired")}</option>
                  <option value="draft">{t("exams.draft")}</option>
                  <option value="upcoming">{t("exams.upcoming")}</option>
                  <option value="active">{t("exams.active")}</option>
                  <option value="finished">{t("exams.finished")}</option>
                  <option value="unscheduled">{t("exams.unscheduled")}</option>
                </Select>
                <Show when={showMoreFilters()}>
                  <Select class="h-9 w-full rounded-sm sm:w-52" value={courseFilter()} onChange={(event) => setCourseFilter(event.currentTarget.value)}>
                    <option value="all">{t("common.all")}</option>
                    <For each={visibleCourses()}>{(course) => <option value={course.id}>{course.title}</option>}</For>
                  </Select>
                </Show>
                <Button type="button" variant="outline" size="sm" class="h-9 rounded-sm" onClick={() => setShowMoreFilters((value) => !value)}>
                  {showMoreFilters() ? t("common.lessFilters") : t("common.moreFilters")}
                </Button>
              </>
            }
          />
        </Suspense>
      </section>

      <SidePanel open={createOpen()} onOpenChange={setCreateOpen} title={t("exams.create")} description={t("exams.subtitle")}>
        <div class="mb-4 space-y-1.5">
          <label class="text-sm font-medium" for="exam-course">
            {t("exams.selectCourse")}
          </label>
          <Select id="exam-course" class="rounded-sm" value={selectedCourseId()} required onChange={(event) => setSelectedCourseId(event.currentTarget.value)}>
            <option value="">{t("exams.selectCourse")}</option>
            <For each={manageableCourses()}>{(course: Course) => <option value={course.id}>{course.title}</option>}</For>
          </Select>
        </div>
        <ExamForm submitLabel={t("common.create")} onCancel={() => setCreateOpen(false)} onSubmit={createExam} />
      </SidePanel>

      <SidePanel open={editingExam() != null} onOpenChange={(open) => !open && setEditingExam(null)} title={t("common.edit")} description={editingExam()?.title}>
        <Show when={editingExam()}>
          {(exam) => <ExamForm initial={exam()} submitLabel={t("common.update")} onCancel={() => setEditingExam(null)} onSubmit={updateExam} />}
        </Show>
      </SidePanel>
    </div>
  );
}
