import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteCourseById } from "@/api/deleteCourseById";
import { deleteCourseEnrollmentByUserId } from "@/api/deleteCourseEnrollmentByUserId";
import { getCourseById } from "@/api/getCourseById";
import { getCourseEnrollments } from "@/api/getCourseEnrollments";
import { getCourseExams } from "@/api/getCourseExams";
import { getMyCourses } from "@/api/getMyCourses";
import { getSettings } from "@/api/getSettings";
import { getTerms } from "@/api/getTerms";
import { patchCourseById } from "@/api/patchCourseById";
import { postCourseEnrollment } from "@/api/postCourseEnrollment";
import { postCourseExam } from "@/api/postCourseExam";
import { formatApiError } from "@/api/client";
import type { CourseKind, Enrollment, Exam } from "@/api/types";
import { ExamLink } from "@/components/exams/exam-link";
import { ExamForm } from "@/components/exams/exam-form";
import { CourseSubjectsPanel } from "@/components/courses/course-subjects-panel";
import { CourseSessionsPanel } from "@/components/sessions/course-sessions-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronLeft, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { createFlash } from "@/lib/flash";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { SectionDisclosure } from "@/components/ui/section-disclosure";
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

  const [course, { refetch: refetchCourse }] = createResource(id, (courseId) => getCourseById(courseId));
  const [terms] = createResource(async () => (await getTerms()).items);
  const [settings] = createResource(() => getSettings());
  const [exams, { refetch: refetchExams }] = createResource(id, async (courseId) => (await getCourseExams(courseId)).items);
  const hasCourseManagementRights = () => {
    const c = course();
    const u = auth.user();
    if (!c || !u) return false;
    return c.creator === u.id || hasMinRole(u.role, "manager");
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
  const [showSubjectForm, setShowSubjectForm] = createSignal(false);
  const [showSessionForm, setShowSessionForm] = createSignal(false);
  const [showEnrollPanel, setShowEnrollPanel] = createSignal(false);
  const [openSections, setOpenSections] = createSignal({ subjects: false, exams: false, sessions: false, roster: false });
  const [subjectCount, setSubjectCount] = createSignal(0);
  const [sessionCount, setSessionCount] = createSignal(0);
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

  const examCount = createMemo(() => exams()?.length ?? 0);
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
      id: "id",
      accessorFn: (row) => row.user.id,
      header: t("admin.id"),
      meta: { cellClass: "mono text-xs text-muted-foreground" },
      cell: (cell) => cell.row.original.user.id,
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
        <Badge variant="outline" class="rounded-sm capitalize">
          {examKindLabel(String(cell.row.original.kind), t)}
          <Show when={examWeight(cell.row.original, settings()?.exam_kinds) != null}>
            {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
          </Show>
        </Badge>
      ),
    },
    {
      id: "mode",
      accessorFn: (row) => examModeLabel(row.mode),
      header: t("exams.mode"),
      cell: (cell) => <Badge variant="secondary" class="rounded-sm">{examModeLabel(cell.row.original.mode)}</Badge>,
    },
    {
      id: "status",
      accessorFn: (row) => (row.draft ? t("exams.draft") : ""),
      header: t("events.status"),
      cell: (cell) => (
        <Show when={cell.row.original.draft} fallback="—">
          <Badge variant="secondary" class="rounded-sm">{t("exams.draft")}</Badge>
        </Show>
      ),
    },
  ]);
  const toggleSection = (section: "subjects" | "exams" | "sessions" | "roster") => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
  };

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
          <div class="space-y-6">
            <div class="space-y-2">
              <div class="detail-breadcrumb">
                <span>{t("nav.group.classes")}</span>
                <span>/</span>
                <Link to="/courses">{t("courses.title")}</Link>
                <span>/</span>
                <span class="truncate">{c().title}</span>
              </div>
              <PageHeader
                accent="violet"
                eyebrow={t("courses.title")}
                title={c().title}
                description={`${t("terms.term")}: ${terms()?.find((term) => term.id === c().term)?.name ?? t("terms.unassigned")}${c().description ? ` - ${c().description}` : ""}`}
                actions={
                  <div class="detail-action-group">
                    <Link to="/courses">
                      <Button variant="ghost" size="sm" class="w-full rounded-sm sm:w-auto">
                        <IconChevronLeft class="h-4 w-4" />
                        {t("common.back")}
                      </Button>
                    </Link>
                    <Show when={canManage()}>
                      <div class="detail-action-divider">
                        <Button type="button" variant="outline" size="sm" class="flex-1 rounded-sm sm:flex-none" onClick={startEdit}>
                          <IconEdit class="h-4 w-4" />
                          {t("common.edit")}
                        </Button>
                        <Button type="button" variant="destructive" size="sm" class="flex-1 rounded-sm sm:flex-none" onClick={() => setDeleteOpen(true)}>
                          <IconTrash class="h-4 w-4" />
                          {t("courses.delete")}
                        </Button>
                      </div>
                    </Show>
                  </div>
                }
              />
              <div class="flex flex-wrap gap-2">
                <Show when={c().capacity != null}>
                  <Badge variant="secondary" class="rounded-sm">
                    {t("courses.capacity")}: {hasCourseManagementRights() ? `${rosterCount()} / ${c().capacity}` : c().capacity}
                  </Badge>
                </Show>
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
                  void navigate({ to: "/courses" });
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
                <div class="space-y-1.5">
                  <Label for="edit-course-title">{t("form.title")}</Label>
                  <Input
                    id="edit-course-title"
                    value={title()}
                    required
                    onInput={(e) => setTitle(e.currentTarget.value)}
                  />
                </div>
                <div class="space-y-1.5">
                  <Label for="edit-course-desc">{t("form.description")}</Label>
                  <Textarea
                    id="edit-course-desc"
                    value={description()}
                    rows={3}
                    onInput={(e) => setDescription(e.currentTarget.value)}
                  />
                </div>
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
                <div class="flex flex-wrap gap-2">
                  <Button type="submit" class="rounded-sm" disabled={pending()}>
                    {t("common.update")}
                  </Button>
                  <Button type="button" variant="outline" class="rounded-sm" onClick={() => setEditing(false)}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            </SidePanel>

            <SidePanel open={showExamForm()} onOpenChange={setShowExamForm} title={t("courses.addExam")} description={c().title}>
              <ExamForm
                submitLabel={t("common.create")}
                onCancel={() => setShowExamForm(false)}
                onSubmit={async (values) => {
                  await postCourseExam(id(), {
                    ...values,
                    description: values.description.trim() || undefined,
                  });
                  setShowExamForm(false);
                  await refetchExams();
                  setFlash(t("common.created"));
                }}
              />
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
                  <Button type="submit" class="rounded-sm" disabled={pending()}>
                    {t("courses.enroll")}
                  </Button>
                  <Button type="button" variant="outline" class="rounded-sm" onClick={() => setShowEnrollPanel(false)}>
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

            <SectionDisclosure
              open={openSections().subjects}
              onToggle={() => toggleSection("subjects")}
              title={t("subjects.title")}
              description={countDescription(subjectCount(), t("subjects.item"))}
              actions={
                <Show when={canManage()}>
                  <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowSubjectForm(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("subjects.add")}
                  </Button>
                </Show>
              }
            >
              <CourseSubjectsPanel courseId={id()} canManage={canManage()} active={openSections().subjects} createOpen={showSubjectForm()} onCreateOpenChange={setShowSubjectForm} onCountChange={setSubjectCount} />
            </SectionDisclosure>

            <SectionDisclosure
              open={openSections().exams}
              onToggle={() => toggleSection("exams")}
              title={t("courses.exams")}
              description={countDescription(examCount(), t("courses.examItem"))}
              actions={
                <Show when={canManage()}>
                  <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowExamForm(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("courses.addExam")}
                  </Button>
                </Show>
              }
            >
              <Suspense fallback={<PageSpinner />}>
                <DataTable columns={examColumns()} data={exams() ?? []} filterColumn="title" enablePagination pageSize={10} empty={t("exams.empty")} />
              </Suspense>
            </SectionDisclosure>

            <SectionDisclosure
              open={openSections().sessions}
              onToggle={() => toggleSection("sessions")}
              title={t("sessions.title")}
              description={countDescription(sessionCount(), t("sessions.item"))}
              actions={
                <Show when={canManage()}>
                  <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowSessionForm(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("sessions.add")}
                  </Button>
                </Show>
              }
            >
              <CourseSessionsPanel
                courseId={id()}
                roster={roster() ?? []}
                canManage={canManage()}
                active={openSections().sessions}
                createOpen={showSessionForm()}
                onCreateOpenChange={setShowSessionForm}
                onCountChange={setSessionCount}
              />
            </SectionDisclosure>

            <Show when={hasCourseManagementRights()}>
              <SectionDisclosure
                open={openSections().roster}
                onToggle={() => toggleSection("roster")}
                title={t("courses.roster")}
                description={countDescription(rosterCount(), t("courses.rosterItem"))}
                actions={
                  <Show when={canManage()}>
                    <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => setShowEnrollPanel(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("courses.enroll")}
                    </Button>
                  </Show>
                }
              >
                <Suspense fallback={<PageSpinner />}>
                  <Show
                    when={(roster() ?? []).length > 0}
                    fallback={
                      <EmptyState
                        title={t("exams.emptyRoster")}
                        action={
                          canManage() ? (
                            <Button type="button" size="sm" class="rounded-lg" onClick={() => setShowEnrollPanel(true)}>
                              <IconPlus class="h-4 w-4" />
                              {t("courses.enroll")}
                            </Button>
                          ) : undefined
                        }
                      />
                    }
                  >
                    <DataTable columns={rosterColumns()} data={roster() ?? []} filterColumn="username" enablePagination pageSize={10} />
                  </Show>
                </Suspense>
              </SectionDisclosure>
            </Show>
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
