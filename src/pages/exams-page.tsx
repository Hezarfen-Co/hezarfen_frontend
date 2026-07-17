import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import { getCourses } from "@/api/getCourses";
import { getExams } from "@/api/getExams";
import { getMyCourses } from "@/api/getMyCourses";
import { patchExamById } from "@/api/patchExamById";
import { postCourseExam } from "@/api/postCourseExam";
import { formatApiError } from "@/api/client";
import type { Course, Exam } from "@/api/types";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { IconEdit, IconEye, IconPlus } from "@/components/ui/icons";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createNow } from "@/lib/create-now";
import { examKindLabel } from "@/lib/exam-labels";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { hasMinRole } from "@/lib/roles";
import { cn } from "@/lib/cn";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EXAM_PAGE_SIZE = 12;

type ExamStatus = "unscheduled" | "upcoming" | "active" | "finished";

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
  const [query, setQuery] = createSignal("");
  const [statusFilter, setStatusFilter] = createSignal<ExamStatus | "all">("all");
  const [courseFilter, setCourseFilter] = createSignal("all");
  const [showMoreFilters, setShowMoreFilters] = createSignal(false);
  const [createOpen, setCreateOpen] = createSignal(false);
  const [selectedCourseId, setSelectedCourseId] = createSignal("");
  const [editingExam, setEditingExam] = createSignal<Exam | null>(null);
  const [page, setPage] = createSignal(0);
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
    visibleCourses().filter((course) => course.creator === auth.user()?.id || hasMinRole(auth.user()?.role, "manager")),
  );
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher") && manageableCourses().length > 0;
  const courseById = createMemo(() => new Map(visibleCourses().map((course) => [course.id, course])));
  const courseTitle = (courseId: string) => courseById().get(courseId)?.title ?? courseId;

  const examStatus = (exam: Exam): ExamStatus => {
    if (exam.mode !== "sync" && exam.mode !== "async" && exam.mode !== "open") return "unscheduled";
    if (exam.mode === "open") return "active";
    const current = now();
    if (exam.ends_at != null && exam.ends_at < current) return "finished";
    if (exam.starts_at != null && exam.starts_at > current) return "upcoming";
    return "active";
  };

  const clientFilterActive = () =>
    query().trim() !== "" || statusFilter() !== "all" || courseFilter() !== "all" || isStudent();

  const filterExams = (items: Exam[]) => {
    const allowed = isStudent() ? new Set(visibleCourses().map((course) => course.id)) : null;
    const needle = query().trim().toLocaleLowerCase(locale());
    return items.filter((exam) => {
      if (allowed && !allowed.has(exam.course)) return false;
      if (statusFilter() !== "all" && examStatus(exam) !== statusFilter()) return false;
      if (courseFilter() !== "all" && exam.course !== courseFilter()) return false;
      if (!needle) return true;
      return [exam.title, exam.description, courseTitle(exam.course), examKindLabel(String(exam.kind), t)]
        .join(" ")
        .toLocaleLowerCase(locale())
        .includes(needle);
    });
  };

  const [list, { refetch: refetchExams }] = createResource(
    () => {
      // Do not track now() here — it ticks every second and would re-fetch forever.
      if (isStudent() && mine() === undefined) return null;
      return [
        page(),
        clientFilterActive() ? "1" : "0",
        query(),
        statusFilter(),
        courseFilter(),
        isStudent() ? "s" : "t",
        (mine() ?? []).map((c) => c.id).join(","),
      ].join("|");
    },
    async () =>
      loadListPage({
        page: page(),
        pageSize: EXAM_PAGE_SIZE,
        clientMode: clientFilterActive(),
        fetch: getExams,
        filter: filterExams,
      }),
  );

  createEffect(() => {
    if (!createOpen() || selectedCourseId()) return;
    setSelectedCourseId(manageableCourses()[0]?.id ?? "");
  });

  const statusLabel = (status: ExamStatus) => {
    if (status === "unscheduled") return t("exams.unscheduled");
    if (status === "finished") return t("exams.finished");
    if (status === "upcoming") return t("exams.upcoming");
    return t("exams.active");
  };

  const statusTone = (status: ExamStatus) => {
    if (status === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    if (status === "upcoming") return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    return "border-muted bg-muted/50 text-muted-foreground";
  };

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), EXAM_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

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
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.group.classes")}</span>
          <span>/</span>
          <span>{t("nav.exams")}</span>
        </div>
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
        <DataToolbar
          searchValue={query()}
          searchPlaceholder={t("exams.searchPlaceholder")}
          onSearchInput={(value) => {
            setQuery(value);
            setPage(0);
          }}
          filters={
            <>
              <Select
                class="h-9 w-full rounded-sm sm:w-40"
                value={statusFilter()}
                onChange={(event) => {
                  setStatusFilter(event.currentTarget.value as ExamStatus | "all");
                  setPage(0);
                }}
              >
                <option value="all">{t("common.all")}</option>
                <option value="upcoming">{t("exams.upcoming")}</option>
                <option value="active">{t("exams.active")}</option>
                <option value="finished">{t("exams.finished")}</option>
                <option value="unscheduled">{t("exams.unscheduled")}</option>
              </Select>
              <Show when={showMoreFilters()}>
                <Select
                  class="h-9 w-full rounded-sm sm:w-52"
                  value={courseFilter()}
                  onChange={(event) => {
                    setCourseFilter(event.currentTarget.value);
                    setPage(0);
                  }}
                >
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

        <Show when={flash()}>
          <Alert variant="success">{flash()}</Alert>
        </Show>
        <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
          <Show when={list.error}>
            <Alert variant="destructive">{formatApiError(list.error)}</Alert>
          </Show>
          <Show
            when={pageItems().length > 0}
            fallback={
              <EmptyState
                title={t("exams.empty")}
                action={
                  canCreate() ? (
                    <Button type="button" size="sm" class="rounded-lg" onClick={() => setCreateOpen(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("exams.create")}
                    </Button>
                  ) : undefined
                }
              />
            }
          >
            <DataTableFrame>
              <Table class="data-table table-fixed min-w-[64rem]">
                <colgroup>
                  <col class="w-[28%]" />
                  <col class="w-[22%]" />
                  <col class="w-[18%]" />
                  <col class="w-[14%]" />
                  <col class="w-[10%]" />
                  <col class="w-[8%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("exams.title")}</TableHead>
                    <TableHead>{t("nav.courses")}</TableHead>
                    <TableHead>{t("events.starts")}</TableHead>
                    <TableHead class="text-center">{t("attempt.status")}</TableHead>
                    <TableHead>{t("exams.kind")}</TableHead>
                    <TableHead class="text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={pageItems()}>
                    {(exam) => {
                      const status = () => examStatus(exam);
                      return (
                        <TableRow>
                          <TableCell>
                            <div class="min-w-0">
                              <p class="truncate font-medium">{exam.title}</p>
                              <p class="truncate text-xs text-muted-foreground">{exam.description || "—"}</p>
                            </div>
                          </TableCell>
                          <TableCell class="truncate text-muted-foreground">{courseTitle(exam.course)}</TableCell>
                          <TableCell class="mono whitespace-nowrap text-muted-foreground">{formatDateTime(exam.starts_at, locale())}</TableCell>
                          <TableCell class="text-center">
                            <Badge variant="outline" class={cn("w-28 justify-center rounded-sm", statusTone(status()))}>
                              {statusLabel(status())}
                            </Badge>
                          </TableCell>
                          <TableCell class="truncate text-muted-foreground">{examKindLabel(String(exam.kind), t)}</TableCell>
                          <TableCell class="text-center">
                            <TableRowActions
                              label={t("common.actions")}
                              actions={[
                                {
                                  label: t("common.view"),
                                  icon: <IconEye class="h-4 w-4" />,
                                  onSelect: () => void navigate({ to: "/exams/$id", params: { id: exam.id } }),
                                },
                                ...(isTeacherPlus() && canEditExam(exam)
                                  ? [
                                      {
                                        label: t("common.edit"),
                                        icon: <IconEdit class="h-4 w-4" />,
                                        onSelect: () => setEditingExam(exam),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    }}
                  </For>
                </TableBody>
              </Table>
            </DataTableFrame>
          </Show>
        </Suspense>

        <Show when={total() > EXAM_PAGE_SIZE}>
          <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
        </Show>
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
