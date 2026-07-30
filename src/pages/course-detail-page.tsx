import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteCourseById } from "@/api/courses";
import { deleteCourseEnrollmentByUserId } from "@/api/courses";
import { getCourseById } from "@/api/courses";
import { getCourseEnrollments } from "@/api/courses";
import { getCourseExams } from "@/api/courses";
import { getMyCourses } from "@/api/reports";
import { getSettings } from "@/api/settings";
import { getTerms } from "@/api/terms";
import { patchCourseById } from "@/api/courses";
import { postCourseEnrollment } from "@/api/courses";
import { postCourseExam } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { CourseKind, Enrollment, Exam } from "@/api/client";
import { patchExamById } from "@/api/exams";
import { ExamLink } from "@/components/exams/exam-link";
import { ExamForm, type ExamFormValues } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { CourseSubjectsPanel } from "@/components/courses/course-subjects-panel";
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
import { IconBook, IconCalendarDays, IconEdit, IconExam, IconHomework, IconPlus, IconSchool, IconTrash, IconUsers } from "@/components/ui/icons";
import { createFlash } from "@/lib/flash";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { hasMinRole } from "@/lib/roles";

const COURSE_KINDS: CourseKind[] = ["course", "study", "club"];

export default function CourseDetailPage() {
  return (
    <RouteGuard>
      <CourseDetailContent />
    </RouteGuard>
  );
}

function CourseDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/courses/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  const [courseTab, setCourseTab] = createSignal("subjects");
  const [course, { refetch: refetchCourse }] = createResource(id, (courseId) => getCourseById(courseId));
  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [settings] = createResource(() => getSettings());
  const [exams, { refetch: refetchExams }] = createResource(
    () => id(),
    async (courseId) => (courseId ? (await getCourseExams(courseId)).items : []),
  );
  const hasCourseManagementRights = () => {
    const c = course();
    const u = auth.user();
    if (!c || !u) return false;
    const isAssigned = (c.teachers ?? []).some((t) => t.id === u.id);
    return c.creator.id === u.id || isAssigned || hasMinRole(u.role, "manager");
  };
  const canDeleteCourse = () => {
    const c = course();
    const u = auth.user();
    if (!c || !u) return false;
    return c.creator.id === u.id || hasMinRole(u.role, "manager");
  };
  const canStaffCourse = () => {
    const u = auth.user();
    if (!u) return false;
    return hasMinRole(u.role, "manager");
  };
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (hasCourseManagementRights() ? id() : null),
    async (courseId) => (courseId ? (await getCourseEnrollments(courseId)).items : []),
  );
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses()).items : []),
  );

  const [editing, setEditing] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [kind, setKind] = createSignal<CourseKind>("course");
  const [termId, setTermId] = createSignal("");
  const [capacity, setCapacity] = createSignal("");
  const [showExamForm, setShowExamForm] = createSignal(false);
  const [examCreateStep, setExamCreateStep] = createSignal<"details" | "questions">("details");
  const [createdCourseExam, setCreatedCourseExam] = createSignal<Exam | null>(null);
  const [showSubjectForm, setShowSubjectForm] = createSignal(false);
  const [showSessionForm, setShowSessionForm] = createSignal(false);
  const [showHomeworkForm, setShowHomeworkForm] = createSignal(false);
  const [showTeacherForm, setShowTeacherForm] = createSignal(false);
  const [showEnrollPanel, setShowEnrollPanel] = createSignal(false);
  const [subjectCount, setSubjectCount] = createSignal(0);
  const [sessionCount, setSessionCount] = createSignal(0);
  const [homeworkCount, setHomeworkCount] = createSignal(0);
  const [enrollUserId, setEnrollUserId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeTarget, setRemoveTarget] = createSignal<{ userId: string; userName: string } | null>(null);

  const canManage = () => {
    return hasCourseManagementRights();
  };

  const canViewCourse = () => {
    const u = auth.user();
    if (!u) return false;
    if (u.role !== "student") return true;
    return (mine() ?? []).some((myCourse) => myCourse.id === id());
  };
  const accessReady = () => auth.user()?.role !== "student" || mine() !== undefined;

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    if (mode === "open") return t("exams.mode.open");
    return t("exams.unscheduled");
  };
  const courseKindLabel = (value: CourseKind | undefined) =>
    value === "study" ? t("courses.kind.study") : value === "club" ? t("courses.kind.club") : t("courses.kind.course");
  const courseListSearch = (value: CourseKind | undefined) => value ? { kind: value } as never : {} as never;

  const examCount = createMemo(() => exams()?.length ?? 0);
  const nextExam = createMemo(() =>
    (exams() ?? [])
      .filter((exam) => (exam.ends_at ?? exam.starts_at ?? 0) > Date.now())
      .sort((a, b) => (a.starts_at ?? a.ends_at ?? 0) - (b.starts_at ?? b.ends_at ?? 0))[0],
  );
  const rosterCount = createMemo(() => roster()?.length ?? 0);
  const countDescription = (count: number, item: string) => t("common.countItem", { count, item });

  const enrolledUserIds = () => (roster() ?? []).map((row) => row.user.id);
  const rosterColumns = createMemo<ColumnDef<Enrollment>[]>(() => [
    {
      id: "username",
      accessorFn: (row) => row.user.display_name || row.user.username,
      header: t("admin.username"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => cell.row.original.user.display_name || cell.row.original.user.username,
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
            {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
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

  const startEdit = () => {
    const c = course();
    if (!c) return;
    setTitle(c.title);
    setDescription(c.description);
    setKind(c.kind ?? "course");
    setTermId(c.term ?? "");
    setCapacity(c.capacity == null ? "" : String(c.capacity));
    setEditing(true);
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={course()?.id === id() ? course() : undefined}
        fallback={
          <Show when={course.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(course.error)}</Alert>
          </Show>
        }
      >
        {(c) => (
          <Show when={accessReady()} fallback={<PageSpinner />}>
            <Show when={canViewCourse()} fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}>
          <div class="mx-auto w-full max-w-[1440px] space-y-6">
            <div class="space-y-2">
              <nav class="detail-breadcrumb">
                <Link to="/courses" search={courseListSearch(c().kind)}>{courseKindLabel(c().kind)}</Link>
                <span aria-hidden>›</span>
                <span class="text-foreground">{c().title}</span>
              </nav>
              <PageHeader
                title={c().title}
                description={c().description || "—"}
                class="border-border/70"
                actions={
                  <Show when={canManage()}>
                    <TableRowActions
                      label={t("common.actions")}
                      actions={[
                        {
                          label: t("common.edit"),
                          icon: <IconEdit class="h-4 w-4" />,
                          onSelect: startEdit,
                        },
                        ...(canDeleteCourse()
                          ? [{
                              label: t("courses.delete"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setDeleteOpen(true),
                            }]
                          : []),
                      ]}
                    />
                  </Show>
                }
              />
              <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div class="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-card p-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <IconBook class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-muted-foreground">{t("courses.kind")}</p>
                    <p class="truncate text-sm font-semibold">{courseKindLabel(c().kind)}</p>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-card p-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <IconCalendarDays class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-muted-foreground">{t("terms.term")}</p>
                    <p class="truncate text-sm font-semibold">{terms()?.find((term) => term.id === c().term)?.name ?? t("terms.unassigned")}</p>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-card p-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <IconUsers class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-muted-foreground">{t("courses.capacity")}</p>
                    <p class="mono truncate text-sm font-semibold">{c().capacity == null ? "—" : hasCourseManagementRights() ? `${rosterCount()} / ${c().capacity}` : c().capacity}</p>
                  </div>
                </div>
                <div class="flex min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-card p-3.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <IconExam class="h-4 w-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-muted-foreground">{t("courses.nextExam")}</p>
                    <Show when={nextExam()} fallback={<p class="truncate text-sm font-semibold">{t("courses.noUpcoming")}</p>}>
                      {(exam) => <ExamLink examId={exam().id} class="block truncate text-sm font-semibold hover:text-primary hover:underline">{exam().title}</ExamLink>}
                    </Show>
                  </div>
                </div>
              </div>
            </div>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("courses.delete") + `: “${c().title}”`}
              onConfirm={async () => {
                await wrap(async () => {
                  await deleteCourseById(id());
                  void navigate({ to: "/courses", search: courseListSearch(c().kind) });
                });
              }}
            />

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
                  await deleteCourseEnrollmentByUserId(id(), target.userId);
                  await refetchRoster();
                  setFlash(t("common.deleted"));
                } catch (err) {
                  setError(formatApiError(err));
                } finally {
                  setRemoveTarget(null);
                }
              }}
            />

            <SidePanel open={editing()} onOpenChange={setEditing} title={t("common.edit")} description={c().title}>
              <form
                class="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void wrap(async () => {
                    const cap = capacity().trim();
                    await patchCourseById(id(), {
                      title: title().trim(),
                      description: description(),
                      kind: kind(),
                      term_id: termId() || null,
                      capacity: cap ? Number(cap) : null,
                    });
                    setEditing(false);
                    await refetchCourse();
                  }, t("common.saved"));
                }}
              >
                <div class="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div class="space-y-1.5">
                    <Label for="edit-course-title">{t("form.title")}</Label>
                    <Input
                      id="edit-course-title"
                      value={title()}
                      required
                      maxlength={200}
                      onInput={(e) => setTitle(e.currentTarget.value)}
                    />
                  </div>
                  <div class="space-y-1.5">
                    <Label for="edit-course-desc">{t("form.description")}</Label>
                    <Textarea
                      id="edit-course-desc"
                      value={description()}
                      rows={3}
                      maxlength={2000}
                      onInput={(e) => setDescription(e.currentTarget.value)}
                    />
                  </div>
                </div>
                <div class="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
                  <div class="space-y-1.5">
                    <Label for="edit-course-kind">{t("courses.kind")}</Label>
                    <Select id="edit-course-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as CourseKind)}>
                      <For each={COURSE_KINDS}>{(item) => <option value={item}>{courseKindLabel(item)}</option>}</For>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="edit-course-term">{t("terms.term")}</Label>
                    <Select id="edit-course-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}>
                      <option value="">{t("terms.unassigned")}</option>
                      <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label for="edit-course-capacity">{t("courses.capacity")}</Label>
                    <Input id="edit-course-capacity" type="number" min={1} value={capacity()} placeholder={t("courses.capacityOptional")} onInput={(e) => setCapacity(e.currentTarget.value)} />
                  </div>
                </div>
                <div class="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
                  <Button type="submit" class="flex-1 rounded-xl sm:flex-none" disabled={pending()}>
                    {t("common.update")}
                  </Button>
                  <Button type="button" variant="outline" class="flex-1 rounded-xl sm:flex-none" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </SidePanel>

            <SidePanel
              open={showExamForm()}
              onOpenChange={(open) => {
                setShowExamForm(open);
                if (!open) {
                  setCreatedCourseExam(null);
                  setExamCreateStep("details");
                }
              }}
              title={createdCourseExam() ? createdCourseExam()!.title : t("courses.addExam")}
              description={createdCourseExam() ? t("exams.step2Questions") : c().title}
              size={examCreateStep() === "questions" ? "wide" : "default"}
            >
              <div class="mb-4 flex rounded-lg border border-border/60 bg-muted/30 p-1">
                <button
                  type="button"
                  class={cn(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "details"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:bg-muted/50",
                  )}
                  onClick={() => setExamCreateStep("details")}
                >
                  {t("exams.step1Details")}
                </button>
                <button
                  type="button"
                  disabled={!createdCourseExam()}
                  class={cn(
                    "rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                    examCreateStep() === "questions"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : createdCourseExam()
                      ? "text-muted-foreground hover:bg-muted/50"
                      : "opacity-40 cursor-not-allowed text-muted-foreground",
                  )}
                  onClick={() => createdCourseExam() && setExamCreateStep("questions")}
                >
                  {t("exams.step2Questions")}
                </button>
              </div>

              <Show when={examCreateStep() === "details"}>
                <ExamForm
                  initial={createdCourseExam() ?? undefined}
                  submitLabel={createdCourseExam() ? t("common.update") : t("exams.nextQuestions")}
                  onCancel={() => setShowExamForm(false)}
                  onSubmit={async (values: ExamFormValues) => {
                    const existing = createdCourseExam();
                    if (existing) {
                      const updated = await patchExamById(existing.id, values);
                      setCreatedCourseExam(updated);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.saved"));
                    } else {
                      const newExam = await postCourseExam(id(), {
                        ...values,
                        description: values.description.trim() || undefined,
                      });
                      setCreatedCourseExam(newExam);
                      await refetchExams();
                      setExamCreateStep("questions");
                      setFlash(t("common.created"));
                    }
                  }}
                />
              </Show>

              <Show when={examCreateStep() === "questions" && createdCourseExam()}>
                <div class="space-y-4">
                  <ExamQuestionsPanel
                    examId={createdCourseExam()!.id}
                    courseId={c().id}
                    embedded
                  />
                  <div class="flex justify-end border-t pt-3">
                    <Button type="button" variant="default" onClick={() => setShowExamForm(false)}>
                      {t("exams.finishAndClose")}
                    </Button>
                  </div>
                </div>
              </Show>
            </SidePanel>

            <SidePanel open={showEnrollPanel()} onOpenChange={setShowEnrollPanel} title={t("courses.enroll")} description={c().title}>
              <form
                class="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void wrap(async () => {
                    const uid = enrollUserId().trim();
                    if (!uid) throw new Error(t("events.userId"));
                    await postCourseEnrollment(id(), uid);
                    setEnrollUserId("");
                    setShowEnrollPanel(false);
                    await refetchRoster();
                  }, t("common.saved"));
                }}
              >
                <UserSearchSelect
                  id="course-enroll-user"
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
            {error() && (
              <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <Tabs value={courseTab()} onChange={setCourseTab} class="space-y-3">
              <TabsList class="border-primary/10 bg-card/80 shadow-sm">
                <TabsTrigger value="subjects"><IconBook class="h-4 w-4" />{t("subjects.title")}</TabsTrigger>
                <TabsTrigger value="exams"><IconExam class="h-4 w-4" />{t("courses.exams")}</TabsTrigger>
                <TabsTrigger value="homework"><IconHomework class="h-4 w-4" />{t("homework.title")}</TabsTrigger>
                <TabsTrigger value="sessions"><IconCalendarDays class="h-4 w-4" />{t("sessions.title")}</TabsTrigger>
                <TabsTrigger value="teachers"><IconSchool class="h-4 w-4" />{t("courses.teachers")}</TabsTrigger>
                <Show when={hasCourseManagementRights()}>
                  <TabsTrigger value="students"><IconUsers class="h-4 w-4" />{t("courses.roster")}</TabsTrigger>
                </Show>
              </TabsList>

              <TabsContent value="subjects" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" class="rounded-full">{countDescription(subjectCount(), t("subjects.item"))}</Badge>
                  <Show when={canManage()}><Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowSubjectForm(true)}><IconPlus class="h-4 w-4" />{t("subjects.add")}</Button></Show>
                </div>
                <CourseSubjectsPanel courseId={id()} canManage={canManage()} active={courseTab() === "subjects"} createOpen={showSubjectForm()} onCreateOpenChange={setShowSubjectForm} onCountChange={setSubjectCount} />
              </TabsContent>

              <TabsContent value="exams" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" class="rounded-full">{countDescription(examCount(), t("courses.examItem"))}</Badge>
                  <Show when={canManage()}><Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowExamForm(true)}><IconPlus class="h-4 w-4" />{t("courses.addExam")}</Button></Show>
                </div>
                <Suspense fallback={<DataTableSkeleton />}><DataTable columns={examColumns()} data={exams() ?? []} filterColumn="title" enablePagination pageSize={10} empty={t("exams.empty")} onRowClick={(exam) => void navigate({ to: "/exams/$id", params: { id: exam.id } })} /></Suspense>
              </TabsContent>

              <TabsContent value="homework" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" class="rounded-full">{countDescription(homeworkCount(), t("homework.item"))}</Badge>
                  <Show when={canManage()}><Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowHomeworkForm(true)}><IconPlus class="h-4 w-4" />{t("homework.add")}</Button></Show>
                </div>
                <CourseHomeworkPanel courseId={id()} canManage={canManage()} active={courseTab() === "homework"} createOpen={showHomeworkForm()} onCreateOpenChange={setShowHomeworkForm} onCountChange={setHomeworkCount} />
              </TabsContent>

              <TabsContent value="sessions" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" class="rounded-full">{countDescription(sessionCount(), t("sessions.item"))}</Badge>
                  <Show when={canManage()}>
                    <Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowSessionForm(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("sessions.add")}
                    </Button>
                  </Show>
                </div>
                <CourseSessionsPanel courseId={id()} roster={roster() ?? []} canManage={canManage()} active={courseTab() === "sessions"} createOpen={showSessionForm()} onCreateOpenChange={setShowSessionForm} onCountChange={setSessionCount} />
              </TabsContent>

              <TabsContent value="teachers" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="secondary" class="rounded-full">{countDescription((c().teachers ?? []).length + 1, t("courses.teachers"))}</Badge>
                  <Show when={canStaffCourse()}><Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowTeacherForm(true)}><IconPlus class="h-4 w-4" />{t("courses.assignTeacher")}</Button></Show>
                </div>
                <div class="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-sm">
                  <IconSchool class="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span><span class="text-muted-foreground">{t("common.creator")}:</span> <span class="font-medium">{c().creator.display_name || c().creator.username}</span></span>
                </div>
                <CourseTeachersPanel courseId={id()} teachers={c().teachers ?? []} canStaff={canStaffCourse()} assignOpen={showTeacherForm()} onAssignOpenChange={setShowTeacherForm} onCourseUpdated={refetchCourse} />
              </TabsContent>

              <Show when={hasCourseManagementRights()}>
                <TabsContent value="students" class="space-y-4 border-border/60 bg-card/80 shadow-sm">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="secondary" class="rounded-full">{countDescription(rosterCount(), t("courses.rosterItem"))}</Badge>
                    <Show when={canManage()}><Button type="button" variant="outline" size="sm" class="rounded-lg border-primary/30 hover:bg-muted" onClick={() => setShowEnrollPanel(true)}><IconPlus class="h-4 w-4" />{t("courses.enroll")}</Button></Show>
                  </div>
                  <Suspense fallback={<DataTableSkeleton />}><Show when={(roster() ?? []).length > 0} fallback={<EmptyState kind="courses" title={t("exams.emptyRoster")} />}><DataTable columns={rosterColumns()} data={roster() ?? []} filterColumn="username" enablePagination pageSize={10} /></Show></Suspense>
                </TabsContent>
              </Show>
            </Tabs>
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
