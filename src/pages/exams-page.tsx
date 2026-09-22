import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import { getCourseById } from "@/api/courses";
import { getExams } from "@/api/exams";
import { patchExamById } from "@/api/exams";
import { getInstanceById, postInstanceExam } from "@/api/instances";
import { loadInstanceOptions } from "@/lib/instance-options";
import { formatApiError } from "@/api/client";
import type { Exam } from "@/api/client";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconCheck, IconEdit, IconEye, IconPlus, IconRotateCcw } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { TruncationNotice } from "@/components/ui/truncation-notice";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createNow } from "@/lib/create-now";
import { EXAM_KINDS } from "@/api/client";
import { examKindLabel } from "@/lib/exam-labels";
import { examDisplayStatus, examStatusMessageKey, examStatusTone, type ExamDisplayStatus } from "@/lib/exam-status";
import { LIST_CAP, loadCappedList } from "@/lib/capped-list";
import { createFlash } from "@/lib/flash";
import { countExamQuestions } from "@/lib/exam-publish";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { matchesSearch } from "@/lib/search-text";
import { scheduleStatusClass, scheduleStatusDotClass } from "@/lib/schedule-status";
import { cn } from "@/lib/cn";
import { createUrlEnum, createUrlString } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

const EXAM_PAGE_SIZE = 10;

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
  const location = useLocation();
  const t = useT();
  const { locale } = usePreferences();
  const now = createNow();
  type ExamTab = "all" | "upcoming" | "completed" | "draft";
  const examTabGroup = (status: ExamDisplayStatus): ExamTab => {
    if (status === "draft") return "draft";
    if (status === "upcoming" || status === "active" || status === "unscheduled") return "upcoming";
    return "completed";
  };
  // Tab and filters live in the URL beside the table's own search/page/sort,
  // so Back from an exam lands on the same slice of the list.
  const [tab, setTab] = createUrlEnum<ExamTab>("tab", ["all", "upcoming", "completed", "draft"], "all");
  const [courseFilter, setCourseFilter] = createUrlString("course", "all");
  const [kindFilter, setKindFilter] = createUrlString("kind", "all");
  const filtersActive = () => courseFilter() !== "all" || kindFilter() !== "all";
  const clearFilters = () => {
    setCourseFilter("all");
    setKindFilter("all");
  };
  const emptyMessage = () =>
    tab() === "upcoming"
      ? t("exams.emptyUpcoming")
      : tab() === "completed"
        ? t("exams.emptyCompleted")
        : tab() === "draft"
          ? t("exams.emptyDraft")
          : t("exams.empty");
  const [createOpen, setCreateOpen] = createSignal(location().searchStr.includes("action=new"));
  createEffect(() => {
    if (location().searchStr.includes("action=new")) {
      setCreateOpen(true);
    }
  });
  const [selectedCourseId, setSelectedCourseId] = createSignal("");
  const [editingExam, setEditingExam] = createSignal<Exam | null>(null);
  const [flash, setFlash] = createFlash();
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  /** A draft exam with no questions, waiting on "publish anyway". */
  const [emptyPublishTarget, setEmptyPublishTarget] = createSignal<Exam | null>(null);

  const [createStep, setCreateStep] = createSignal<"details" | "questions">("details");
  const [createdExam, setCreatedExam] = createSignal<Exam | null>(null);
  const [editTab, setEditTab] = createSignal<"details" | "questions">("details");

  // An exam is set inside an instance (şube × ders), so everything on this page
  // — the filter, the picker, the section column — keys on the instance and
  // resolves the catalog title through it.
  const [sections] = createResource(
    () => auth.user()?.role ?? null,
    (role) => loadInstanceOptions(role ?? undefined),
  );

  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
  const isStudent = () => auth.user()?.role === "student";
  const canEditExam = (exam: Exam) => exam.creator === auth.user()?.id || hasMinRole(auth.user()?.role, "manager");
  const visibleCourses = createMemo(() => sections() ?? []);
  // Teacher+ may set an exam in any section the picker offers them; the backend
  // is the real gate and answers 403 for anything else.
  const manageableCourses = createMemo(() => (hasMinRole(auth.user()?.role, "teacher") ? visibleCourses() : []));
  const canCreate = () => hasMinRole(auth.user()?.role, "teacher") && manageableCourses().length > 0;
  /** Instance id → label, filled for rows the picker did not already name. */
  const [courseMap, setCourseMap] = createSignal<Record<string, string>>({});
  const courseTitle = (instanceId: string) => {
    const cached = visibleCourses().find((row) => row.id === instanceId);
    if (cached) return cached.label;
    return courseMap()[instanceId] ?? instanceId;
  };

  const examStatus = (exam: Exam) => examDisplayStatus(exam, now());
  // The question bank keys on the catalog course, which an exam only names
  // through its instance.
  const examCourseId = (exam: Exam) => visibleCourses().find((row) => row.id === exam.class_course)?.course ?? null;

  const filterExams = (items: Exam[]) => {
    const allowed = isStudent() ? new Set(visibleCourses().map((row) => row.id)) : null;
    return items.filter((exam) => {
      if (allowed && !allowed.has(exam.class_course)) return false;
      if (tab() !== "all" && examTabGroup(examStatus(exam)) !== tab()) return false;
      if (courseFilter() !== "all" && exam.class_course !== courseFilter()) return false;
      if (kindFilter() !== "all" && String(exam.kind) !== kindFilter()) return false;
      return true;
    });
  };
  const searchExam = (exam: ExamRow, query: string) =>
    matchesSearch(
      query,
      exam.title,
      exam.description,
      courseTitle(exam.class_course),
      examKindLabel(String(exam.kind), t),
      statusLabel(exam.displayStatus),
    );

  const [loadAll, setLoadAll] = createSignal(false);
  const [list, { refetch: refetchExams }] = createResource(
    () => {
      if (sections() === undefined) return null;
      return `${loadAll() ? "all" : "capped"}|${visibleCourses().map((row) => row.id).join(",")}`;
    },
    async () => {
      const page = await loadCappedList(getExams, LIST_CAP, loadAll());
      const items = page.items;
      const known = new Map(visibleCourses().map((row) => [row.id, row.label]));
      const missing = [...new Set(items.map((exam) => exam.class_course))].filter((instanceId) => !known.has(instanceId));
      if (missing.length > 0) {
        await Promise.all(
          missing.map(async (instanceId) => {
            try {
              const instance = await getInstanceById(instanceId);
              known.set(instanceId, (await getCourseById(instance.course)).title);
            } catch {
              // The id stays as the label.
            }
          }),
        );
      }
      setCourseMap(Object.fromEntries(known));
      return page;
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
  // A memo, not a function: the table must see one array per change, not a
  // fresh one on every read.
  const rows = createMemo((): ExamRow[] => filterExams(list()?.items ?? []).map((exam) => ({ ...exam, displayStatus: examStatus(exam) })));
  const columns = createMemo<ColumnDef<ExamRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("exams.title"),
      size: 220,
      minSize: 160,
      cell: (cell) => (
        <div class="min-w-0">
          <p class="truncate font-medium">{cell.row.original.title}</p>
        </div>
      ),
    },
    {
      id: "course",
      accessorFn: (exam) => courseTitle(exam.class_course),
      header: t("instances.title"),
      size: 180,
      minSize: 140,
      meta: { cellClass: "truncate text-muted-foreground" },
      cell: (cell) => courseTitle(cell.row.original.class_course),
    },
    {
      accessorKey: "starts_at",
      header: t("events.starts"),
      size: 160,
      minSize: 140,
      meta: { cellClass: "whitespace-nowrap text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.starts_at, locale()),
    },
    {
      id: "status",
      accessorFn: (exam) => statusLabel(exam.displayStatus),
      header: t("attempt.status"),
      // The pill is min-w-24 plus cell padding: narrower clips it.
      size: 140,
      minSize: 120,
      meta: { headerClass: "text-center", cellClass: "text-center" },
      cell: (cell) => {
        const status = cell.row.original.displayStatus;
        return (
          <Badge variant="outline" class={cn("min-w-24 max-w-full justify-center whitespace-nowrap", scheduleStatusClass(examStatusTone(status)))}>
            <span class={cn("mr-1.5 h-1.5 w-1.5 rounded-full", scheduleStatusDotClass(examStatusTone(status)))} />
            {statusLabel(status)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
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
      // `term` is create-only — the backend cannot move a filed exam.
      const { term: _term, ...patch } = values;
      const updated = await patchExamById(existing.id, patch);
      setCreatedExam(updated);
      await refetchExams();
      setCreateStep("questions");
      setFlash(t("common.saved"));
    } else {
      const instanceId = selectedCourseId();
      if (!instanceId) throw new Error(t("instances.selectSection"));
      const newExam = await postInstanceExam(instanceId, {
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
    const { term: _term, ...patch } = values;
    const updated = await patchExamById(exam.id, patch);
    setEditingExam(updated);
    await refetchExams();
    setFlash(t("common.saved"));
  };

  const publishExam = async (exam: Exam, force = false) => {
    setPending(true);
    setError("");
    try {
      // An exam with no questions is almost always a mistake — ask first.
      if (!force && (await countExamQuestions(exam.id)) === 0) {
        setEmptyPublishTarget(exam);
        return;
      }
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
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !createOpen()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Tabs value={tab()} onChange={(value) => setTab(value as ExamTab)}>
        <TabsList aria-label={t("exams.title")}>
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="upcoming">{t("exams.upcoming")}</TabsTrigger>
          <TabsTrigger value="completed">{t("exams.finished")}</TabsTrigger>
          <TabsTrigger value="draft">{t("exams.draft")}</TabsTrigger>
        </TabsList>

        <TabsContent value={tab()} class="mt-4 border-0 bg-transparent p-0 shadow-none">
          <section class="space-y-4 p-0">
            <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
              <Show when={list.error}>
                <Alert variant="destructive">{formatApiError(list.error)}</Alert>
              </Show>
              <TruncationNotice
                shown={list()?.items.length ?? 0}
                total={list()?.total ?? 0}
                loading={list.loading}
                onLoadAll={() => setLoadAll(true)}
              />
              <DataTable
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
                columns={columns()}
                data={rows()}
                filterPlaceholder={t("exams.searchPlaceholder")}
                filterHint={t("search.hint.exams")}
                searchPredicate={searchExam}
                enablePagination
                pageSize={EXAM_PAGE_SIZE}
                empty={emptyMessage()}
                urlState
                pageResetKey={`${tab()}|${courseFilter()}|${kindFilter()}`}
                filtersActive={filtersActive()}
                onClearFilters={clearFilters}
                storageKey="exams"
                onRowClick={(exam) => void navigate({ to: "/exams/$id", params: { id: exam.id } })}
                filters={
                  <div class="flex flex-wrap items-center gap-2.5">
                    <DropdownSelect
                      labelPrefix={t("nav.courses")}
                      value={courseFilter()}
                      onChange={(val) => setCourseFilter(val)}
                      options={[
                        { value: "all", label: t("common.all") },
                        ...visibleCourses().map((row) => ({ value: row.id, label: row.label })),
                      ]}
                    />

                    <DropdownSelect
                      labelPrefix={t("exams.kind")}
                      value={kindFilter()}
                      onChange={(val) => setKindFilter(val)}
                      options={[
                        { value: "all", label: t("common.all") },
                        ...EXAM_KINDS.map((kind) => ({ value: kind, label: examKindLabel(kind, t) })),
                      ]}
                    />

                    <Show when={filtersActive()}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                        onClick={clearFilters}
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
        </TabsContent>
      </Tabs>

      <SidePanel
        open={createOpen()}
        // Only the details step holds unsaved input; once the exam exists the
        // questions step saves each question itself.
        guardUnsaved={createStep() === "details"}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            setCreatedExam(null);
            setCreateStep("details");
          }
        }}
        title={createdExam() ? createdExam()!.title : t("exams.create")}
        description={createdExam() ? t("exams.step2Questions") : t("exams.createSubtitle")}
        size={createStep() === "questions" ? "wide" : "default"}
      >
        <div class="mb-4 flex rounded-md border border-border-line bg-surface-overlay p-1">
          <button
            type="button"
            class={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              createStep() === "details"
                ? "bg-surface-base text-foreground shadow-xs"
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
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              createStep() === "questions"
                ? "bg-surface-base text-foreground shadow-xs"
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
            <div class="mb-4 space-y-1.5 rounded-xl border border-border-line bg-surface-overlay p-4">
              <label class="text-sm font-medium" for="exam-course">
                {t("instances.selectSection")}
              </label>
              <SearchableSelect id="exam-course" value={selectedCourseId()} required onChange={setSelectedCourseId} placeholder={t("instances.selectSection")} options={manageableCourses().map((row) => ({ value: row.id, label: row.label }))} />
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
              courseId={examCourseId(createdExam()!)}
              embedded
            />
            <div class="flex flex-wrap items-center justify-end gap-3 border-t pt-3">
              <Show when={createdExam()!.draft}>
                <p class="mr-auto text-xs text-muted-foreground">{t("exams.savedAsDraftHint")}</p>
              </Show>
              <Button type="button" variant="default" onClick={() => setCreateOpen(false)}>
                {t("exams.finishAndClose")}
              </Button>
            </div>
          </div>
        </Show>
      </SidePanel>

      <ConfirmDialog
        open={emptyPublishTarget() != null}
        onOpenChange={(open) => {
          if (!open) setEmptyPublishTarget(null);
        }}
        title={t("exams.publishEmptyTitle")}
        summary={t("exams.publishEmptyWarning")}
        confirmLabel={t("exams.publishAnyway")}
        onConfirm={async () => {
          const exam = emptyPublishTarget();
          if (exam) await publishExam(exam, true);
        }}
      />

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
              <div class="flex rounded-md border border-border-line bg-surface-overlay p-1">
                <button
                  type="button"
                  class={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    editTab() === "details"
                      ? "bg-surface-base text-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setEditTab("details")}
                >
                  {t("exams.step1Details")}
                </button>
                <button
                  type="button"
                  class={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    editTab() === "questions"
                      ? "bg-surface-base text-foreground shadow-xs"
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
                  courseId={examCourseId(exam())}
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
