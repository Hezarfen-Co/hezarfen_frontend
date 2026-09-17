import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getClassById } from "@/api/classes";
import { getCourseById } from "@/api/courses";
import {
  deleteInstanceEnrollmentByUserId,
  getInstanceById,
  getInstanceEnrollments,
  getInstanceExams,
  patchInstanceById,
  postInstanceEnrollment,
  postInstanceExam,
} from "@/api/instances";
import { getSettings } from "@/api/settings";
import { formatApiError } from "@/api/client";
import type { Enrollment, Exam } from "@/api/client";
import { patchExamById } from "@/api/exams";
import { ExamLink } from "@/components/exams/exam-link";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { CourseTeachersPanel } from "@/components/courses/course-teachers-panel";
import { CourseHomeworkPanel } from "@/components/homework/course-homework-panel";
import { CourseSessionsPanel } from "@/components/sessions/course-sessions-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCalendarDays, IconExam, IconHomework, IconPlus, IconSchool, IconTrash, IconUsers } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { cn } from "@/lib/cn";
import { createFlash } from "@/lib/flash";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function InstanceDetailPage() {
  return (
    <RouteGuard>
      <InstanceDetailContent />
    </RouteGuard>
  );
}

function InstanceDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/instances/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  const [tab, setTab] = createSignal("exams");
  const [instance, { refetch: refetchInstance }] = createResource(id, (instanceId) => getInstanceById(instanceId));
  const [course] = createResource(() => instance()?.course ?? null, (courseId) => getCourseById(courseId));
  const [klass] = createResource(() => instance()?.class ?? null, (classId) => getClassById(classId).catch(() => null));
  const [settings] = createResource(() => getSettings());

  // Manager+, an assigned teacher, or the şube's homeroom teacher may run it.
  const canManage = () => {
    const i = instance();
    const u = auth.user();
    if (!i || !u) return false;
    if (hasMinRole(u.role, "manager")) return true;
    if (i.teachers.some((teacher) => teacher.id === u.id)) return true;
    return klass.latest?.teacher?.id === u.id;
  };
  const canStaff = () => hasMinRole(auth.user()?.role ?? "student", "manager");

  const [exams, { refetch: refetchExams }] = createResource(
    () => id(),
    async (instanceId) => (instanceId ? (await getInstanceExams(instanceId)).items : []),
  );
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (canManage() ? id() : null),
    async (instanceId) => (instanceId ? (await getInstanceEnrollments(instanceId)).items : []),
  );

  const [showExamForm, setShowExamForm] = createSignal(false);
  const [examCreateStep, setExamCreateStep] = createSignal<"details" | "questions">("details");
  const [createdExam, setCreatedExam] = createSignal<Exam | null>(null);
  const [showSessionForm, setShowSessionForm] = createSignal(false);
  const [showHomeworkForm, setShowHomeworkForm] = createSignal(false);
  const [showTeacherForm, setShowTeacherForm] = createSignal(false);
  const [showEnrollPanel, setShowEnrollPanel] = createSignal(false);
  const [sessionCount, setSessionCount] = createSignal(0);
  const [homeworkCount, setHomeworkCount] = createSignal(0);
  const [enrollUserId, setEnrollUserId] = createSignal("");
  const [removeTarget, setRemoveTarget] = createSignal<{ userId: string; userName: string } | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  // Policy edits are two inline writes on a shared resource, so they keep local
  // signals and PATCH optimistically instead of refetching the instance.
  const [countsTowardKarne, setCountsTowardKarne] = createSignal(true);
  const [dersSaati, setDersSaati] = createSignal("");
  const [savingPolicy, setSavingPolicy] = createSignal(false);
  createEffect(() => {
    const i = instance();
    if (!i) return;
    setCountsTowardKarne(i.counts_toward_karne);
    setDersSaati(String(i.ders_saati));
  });

  const toggleKarne = async (next: boolean) => {
    if (savingPolicy()) return;
    setCountsTowardKarne(next);
    setSavingPolicy(true);
    try {
      await patchInstanceById(id(), { counts_toward_karne: next });
    } catch (err) {
      setCountsTowardKarne(!next);
      setError(formatApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const saveDersSaati = async () => {
    const value = Number(dersSaati().trim());
    const current = instance()?.ders_saati;
    if (!Number.isInteger(value) || value < 0 || value === current) {
      setDersSaati(String(current ?? ""));
      return;
    }
    setSavingPolicy(true);
    try {
      await patchInstanceById(id(), { ders_saati: value });
      await refetchInstance();
    } catch (err) {
      setDersSaati(String(current ?? ""));
      setError(formatApiError(err));
    } finally {
      setSavingPolicy(false);
    }
  };

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    if (mode === "open") return t("exams.mode.open");
    return t("exams.unscheduled");
  };
  const countDescription = (count: number, item: string) => t("common.countItem", { count, item });
  const examCount = createMemo(() => exams()?.length ?? 0);
  const rosterCount = createMemo(() => roster()?.length ?? 0);
  const enrolledUserIds = () => (roster() ?? []).map((row) => row.user.id);

  const rosterColumns = createMemo<ColumnDef<Enrollment>[]>(() => [
    {
      id: "username",
      accessorFn: (row) => row.user.display_name || row.user.username,
      header: t("admin.username"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => (
        <span class="flex items-center gap-2">
          {cell.row.original.user.display_name || cell.row.original.user.username}
          <Show when={cell.row.original.source}>
            <Badge variant="secondary" class="rounded-full text-xs font-normal">
              {t("course.fromClass", { name: klass.latest?.name ?? "—" })}
            </Badge>
          </Show>
        </span>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <Show when={canManage()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              {
                label: t("common.remove"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () =>
                  setRemoveTarget({
                    userId: cell.row.original.user.id,
                    userName: cell.row.original.user.display_name || cell.row.original.user.username,
                  }),
              },
            ]}
          />
        </Show>
      ),
    },
  ]);

  const examColumns = createMemo<ColumnDef<Exam>[]>(() => [
    {
      accessorKey: "title",
      header: t("form.title"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => (
        <ExamLink examId={cell.row.original.id} class="hover:text-primary hover:underline">
          {cell.row.original.title}
        </ExamLink>
      ),
    },
    {
      id: "kind",
      accessorFn: (row) => examKindLabel(String(row.kind), t),
      header: t("exams.kind"),
      cell: (cell) => (
        <Badge variant="outline" class="rounded-full capitalize">
          {examKindLabel(String(cell.row.original.kind), t)}
          <Show when={examWeight(cell.row.original, settings()?.exam_kinds)}>
            {(weight) => <span class="ml-1 text-text-subtle">({t("courses.weight")}: {weight()})</span>}
          </Show>
        </Badge>
      ),
    },
    {
      id: "mode",
      accessorFn: (row) => examModeLabel(row.mode),
      header: t("exams.mode"),
      cell: (cell) => <Badge variant="secondary" class="rounded-full">{examModeLabel(cell.row.original.mode)}</Badge>,
    },
    {
      id: "status",
      accessorFn: (row) => (row.draft ? t("exams.draft") : ""),
      header: t("events.status"),
      cell: (cell) => (
        <Show when={cell.row.original.draft} fallback="—">
          <Badge variant="secondary" class="rounded-full">{t("exams.draft")}</Badge>
        </Show>
      ),
    },
  ]);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={instance()?.id === id() ? instance() : undefined}
        fallback={
          <Show when={instance.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(instance.error)}</Alert>
          </Show>
        }
      >
        {(inst) => (
          <div class="mx-auto w-full max-w-[1440px] space-y-4">
            <div class="space-y-1.5">
              <nav class="detail-breadcrumb">
                <Link to="/courses" search={{} as never}>{t("courses.title")}</Link>
                <span aria-hidden>›</span>
                <Link to="/courses/$id" params={{ id: inst().course }}>{course.latest?.title ?? "…"}</Link>
                <span aria-hidden>›</span>
                <span class="text-foreground">{klass.latest?.name ?? t("instances.title")}</span>
              </nav>
              <PageHeader
                title={`${course.latest?.title ?? ""} — ${klass.latest?.name ?? ""}`.replace(/^ — | — $/, "")}
                description={t("instances.selectSectionHelp")}
                class="border-border-line"
              />
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconCalendarDays class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("instances.dersSaati")}</p>
                    <Show
                      when={canManage()}
                      fallback={<p class="mono truncate text-sm font-semibold text-text-default">{inst().ders_saati}</p>}
                    >
                      <Input
                        aria-label={t("instances.dersSaati")}
                        class="h-7 w-20 px-2 py-0 text-sm"
                        type="number"
                        min={0}
                        value={dersSaati()}
                        disabled={savingPolicy()}
                        onInput={(e) => setDersSaati(e.currentTarget.value)}
                        onBlur={() => void saveDersSaati()}
                      />
                    </Show>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconSchool class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("instances.countsTowardKarne")}</p>
                    <Show
                      when={canManage()}
                      fallback={
                        <p class="truncate text-sm font-semibold text-text-default">
                          {inst().counts_toward_karne ? t("common.yes") : t("common.no")}
                        </p>
                      }
                    >
                      <label class="inline-flex cursor-pointer items-center gap-2 text-xs">
                        <span class="relative shrink-0">
                          <input
                            type="checkbox"
                            class="peer sr-only"
                            checked={countsTowardKarne()}
                            disabled={savingPolicy()}
                            aria-label={t("instances.countsTowardKarne")}
                            onChange={(event) => void toggleKarne(event.currentTarget.checked)}
                          />
                          <span class="block h-6 w-10 rounded-full bg-input ring-1 ring-inset ring-black/5 transition-colors peer-checked:bg-primary peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-ring dark:ring-white/10" />
                          <span class="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
                        </span>
                      </label>
                    </Show>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconUsers class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("courses.roster")}</p>
                    <p class="mono truncate text-sm font-semibold text-text-default">{inst().enrollment_count}</p>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                    <IconExam class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-text-subtle">{t("courses.exams")}</p>
                    <p class="mono truncate text-sm font-semibold text-text-default">{examCount()}</p>
                  </div>
                </div>
              </div>
            </div>

            <ConfirmDialog
              open={removeTarget() !== null}
              onOpenChange={() => setRemoveTarget(null)}
              title={t("course.removeStudent")}
              variant="destructive"
              summary={`${t("course.removeStudentConfirm")} "${removeTarget()?.userName}"?`}
              onConfirm={async () => {
                const target = removeTarget();
                if (!target) return;
                try {
                  await deleteInstanceEnrollmentByUserId(id(), target.userId);
                  await refetchRoster();
                  setFlash(t("common.deleted"));
                } catch (err) {
                  setError(formatApiError(err));
                } finally {
                  setRemoveTarget(null);
                }
              }}
            />

            <SidePanel
              open={showExamForm()}
              onOpenChange={(open) => {
                setShowExamForm(open);
                if (!open) {
                  setCreatedExam(null);
                  setExamCreateStep("details");
                }
              }}
              title={createdExam() ? createdExam()!.title : t("courses.addExam")}
              description={createdExam() ? t("exams.step2Questions") : course.latest?.title}
              size={examCreateStep() === "questions" ? "wide" : "default"}
            >
              <div class="mb-4 flex rounded-xl border border-border-line bg-surface-tint p-1">
                <button
                  type="button"
                  class={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "details"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-text-subtle hover:bg-surface-fill",
                  )}
                  onClick={() => setExamCreateStep("details")}
                >
                  {t("exams.step1Details")}
                </button>
                <button
                  type="button"
                  disabled={!createdExam()}
                  class={cn(
                    "rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "questions"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : createdExam()
                      ? "text-text-subtle hover:bg-surface-fill"
                      : "opacity-40 cursor-not-allowed text-text-subtle",
                  )}
                  onClick={() => createdExam() && setExamCreateStep("questions")}
                >
                  {t("exams.step2Questions")}
                </button>
              </div>

              <Show when={examCreateStep() === "details"}>
                <ExamForm
                  initial={createdExam() ?? undefined}
                  submitLabel={createdExam() ? t("common.update") : t("exams.nextQuestions")}
                  onCancel={() => setShowExamForm(false)}
                  onSubmit={async (values: ExamFormValues) => {
                    const existing = createdExam();
                    if (existing) {
                      // `term` is create-only: the backend cannot move a filed exam.
                      const { term: _term, ...patch } = values;
                      const updated = await patchExamById(existing.id, patch);
                      setCreatedExam(updated);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.saved"));
                    } else {
                      const newExam = await postInstanceExam(id(), {
                        ...values,
                        description: values.description.trim() || undefined,
                      });
                      setCreatedExam(newExam);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.created"));
                    }
                  }}
                />
              </Show>

              <Show when={examCreateStep() === "questions" && createdExam()}>
                <div class="space-y-4">
                  <ExamQuestionsPanel examId={createdExam()!.id} courseId={inst().course} embedded />
                  <div class="flex justify-end border-t pt-3">
                    <Button type="button" variant="default" onClick={() => setShowExamForm(false)}>
                      {t("exams.finishAndClose")}
                    </Button>
                  </div>
                </div>
              </Show>
            </SidePanel>

            <SidePanel open={showEnrollPanel()} onOpenChange={setShowEnrollPanel} title={t("courses.enroll")} description={course.latest?.title}>
              <form
                class="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    setError("");
                    setPending(true);
                    try {
                      const uid = enrollUserId().trim();
                      if (!uid) throw new Error(t("events.userId"));
                      await postInstanceEnrollment(id(), uid);
                      setEnrollUserId("");
                      setShowEnrollPanel(false);
                      await refetchRoster();
                      setFlash(t("common.saved"));
                    } catch (err) {
                      setError(formatApiError(err));
                    } finally {
                      setPending(false);
                    }
                  })();
                }}
              >
                <UserSearchSelect
                  id="instance-enroll-user"
                  value={enrollUserId()}
                  excludeIds={enrolledUserIds()}
                  placeholder={t("form.selectStudent")}
                  onChange={setEnrollUserId}
                  role="student"
                />
                <div class="flex flex-wrap gap-2">
                  <Button type="submit" class="rounded-xl" disabled={pending()}>
                    {t("courses.enroll")}
                  </Button>
                  <Button type="button" variant="outline" class="rounded-xl" onClick={() => setShowEnrollPanel(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </SidePanel>

            <Show when={flash()}>
              <Alert variant="success">{flash()}</Alert>
            </Show>
            <Show when={error()}>
              <p class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            </Show>

            <Tabs value={tab()} onChange={setTab} class="space-y-4">
              <TabsList class="flex w-full justify-start overflow-x-auto sm:grid sm:grid-cols-3 xl:grid-cols-5" aria-label={course.latest?.title ?? ""}>
                <TabsTrigger value="exams" class="min-w-0"><IconExam class="h-4 w-4" />{t("courses.exams")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{examCount()}</Badge></TabsTrigger>
                <TabsTrigger value="homework" class="min-w-0"><IconHomework class="h-4 w-4" />{t("homework.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{homeworkCount()}</Badge></TabsTrigger>
                <TabsTrigger value="sessions" class="min-w-0"><IconCalendarDays class="h-4 w-4" />{t("sessions.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{sessionCount()}</Badge></TabsTrigger>
                <TabsTrigger value="teachers" class="min-w-0"><IconSchool class="h-4 w-4" />{t("courses.teachers")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{inst().teachers.length}</Badge></TabsTrigger>
                <Show when={canManage()}>
                  <TabsTrigger value="students" class="min-w-0"><IconUsers class="h-4 w-4" />{t("courses.roster")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{rosterCount()}</Badge></TabsTrigger>
                </Show>
              </TabsList>

              <TabsContent value="exams" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" class="rounded-full">{countDescription(examCount(), t("courses.examItem"))}</Badge>
                  <Show when={canManage()}>
                    <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowExamForm(true)}>
                      <IconPlus class="h-4 w-4" />{t("courses.addExam")}
                    </Button>
                  </Show>
                </div>
                <Suspense fallback={<DataTableSkeleton />}>
                  <DataTable
                    columns={examColumns()}
                    data={exams() ?? []}
                    filterColumn="title"
                    enablePagination
                    pageSize={10}
                    empty={t("exams.empty")}
                    onRowClick={(exam) => void navigate({ to: "/exams/$id", params: { id: exam.id } })}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="homework" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" class="rounded-full">{countDescription(homeworkCount(), t("homework.item"))}</Badge>
                  <Show when={canManage()}>
                    <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowHomeworkForm(true)}>
                      <IconPlus class="h-4 w-4" />{t("homework.add")}
                    </Button>
                  </Show>
                </div>
                <CourseHomeworkPanel
                  instanceId={id()}
                  courseId={inst().course}
                  canManage={canManage()}
                  active={tab() === "homework"}
                  createOpen={showHomeworkForm()}
                  onCreateOpenChange={setShowHomeworkForm}
                  onCountChange={setHomeworkCount}
                />
              </TabsContent>

              <TabsContent value="sessions" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" class="rounded-full">{countDescription(sessionCount(), t("sessions.item"))}</Badge>
                  <Show when={canManage()}>
                    <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowSessionForm(true)}>
                      <IconPlus class="h-4 w-4" />{t("sessions.add")}
                    </Button>
                  </Show>
                </div>
                <CourseSessionsPanel
                  instanceId={id()}
                  roster={roster() ?? []}
                  canManage={canManage()}
                  active={tab() === "sessions"}
                  createOpen={showSessionForm()}
                  onCreateOpenChange={setShowSessionForm}
                  onCountChange={setSessionCount}
                />
              </TabsContent>

              <TabsContent value="teachers" class="space-y-3">
                <div class="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary" class="rounded-full">{countDescription(inst().teachers.length, t("courses.teachers"))}</Badge>
                  <Show when={canStaff()}>
                    <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowTeacherForm(true)}>
                      <IconPlus class="h-4 w-4" />{t("courses.assignTeacher")}
                    </Button>
                  </Show>
                </div>
                <CourseTeachersPanel
                  instanceId={id()}
                  teachers={inst().teachers}
                  canStaff={canStaff()}
                  assignOpen={showTeacherForm()}
                  onAssignOpenChange={setShowTeacherForm}
                  onInstanceUpdated={refetchInstance}
                />
              </TabsContent>

              <Show when={canManage()}>
                <TabsContent value="students" class="space-y-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" class="rounded-full">{countDescription(rosterCount(), t("courses.rosterItem"))}</Badge>
                    <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowEnrollPanel(true)}>
                      <IconPlus class="h-4 w-4" />{t("courses.enroll")}
                    </Button>
                  </div>
                  <Suspense fallback={<DataTableSkeleton />}>
                    <Show when={(roster() ?? []).length > 0} fallback={<EmptyState kind="people" title={t("exams.emptyRoster")} />}>
                      <DataTable columns={rosterColumns()} data={roster() ?? []} filterColumn="username" enablePagination pageSize={10} />
                    </Show>
                  </Suspense>
                </TabsContent>
              </Show>
            </Tabs>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
