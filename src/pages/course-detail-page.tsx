import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
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
import { ExamLink } from "@/components/exams/exam-link";
import { ExamForm } from "@/components/exams/exam-form";
import { CourseSessionsPanel } from "@/components/sessions/course-sessions-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableFrame } from "@/components/ui/data-table";
import { IconChevronLeft, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { hasMinRole } from "@/lib/roles";

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
  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
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
  const [termId, setTermId] = createSignal("");
  const [showExamForm, setShowExamForm] = createSignal(false);
  const [showSessionForm, setShowSessionForm] = createSignal(false);
  const [showEnrollPanel, setShowEnrollPanel] = createSignal(false);
  const [openSections, setOpenSections] = createSignal({ exams: true, sessions: false, roster: false });
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

  const examCount = createMemo(() => exams()?.length ?? 0);
  const rosterCount = createMemo(() => roster()?.length ?? 0);
  const examKindCount = createMemo(() => new Set((exams() ?? []).map((exam) => exam.kind)).size);

  const enrolledUserIds = () => (roster() ?? []).map((row) => row.user.id);
  const toggleSection = (section: "exams" | "sessions" | "roster") => {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }));
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

  const startEdit = () => {
    const c = course();
    if (!c) return;
    setTitle(c.title);
    setDescription(c.description);
    setTermId(c.term ?? "");
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
              <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                <span>{t("nav.group.classes")}</span>
                <span>/</span>
                <Link to="/courses" class="hover:text-foreground">{t("courses.title")}</Link>
                <span>/</span>
                <span class="truncate">{c().title}</span>
              </div>
              <PageHeader
                accent="violet"
                eyebrow={t("courses.title")}
                title={c().title}
                description={c().description || undefined}
                actions={
                  <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm sm:w-auto">
                    <Link to="/courses">
                      <Button variant="ghost" size="sm" class="w-full rounded-sm sm:w-auto">
                        <IconChevronLeft class="h-4 w-4" />
                        {t("common.back")}
                      </Button>
                    </Link>
                    <Show when={canManage()}>
                      <div class="flex flex-1 items-center gap-1 border-t border-border pt-1 sm:ml-1 sm:flex-none sm:border-l sm:border-t-0 sm:pl-1 sm:pt-0">
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
                    await patchCourseById(id(), {
                      title: title().trim(),
                      description: description(),
                      term_id: termId() || null,
                    });
                    setEditing(false);
                    await refetchCourse();
                  });
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
                  <Label for="edit-course-term">{t("terms.term")}</Label>
                  <Select id="edit-course-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}>
                    <option value="">{t("terms.unassigned")}</option>
                    <For each={terms() ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For>
                  </Select>
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
                  });
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

            {error() && (
              <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div class="data-shell p-4">
                <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("courses.exams")}
                </p>
                <p class="mono mt-2 text-3xl font-semibold tabular-nums">{examCount()}</p>
                <p class="mt-1 text-xs text-muted-foreground">{t("nav.exams")}</p>
              </div>

              <Show when={isTeacherPlus()}>
                <div class="data-shell p-4">
                  <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {t("courses.roster")}
                  </p>
                  <p class="mono mt-2 text-3xl font-semibold tabular-nums">{rosterCount()}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{t("courses.enroll")}</p>
                </div>
              </Show>

              <div class="data-shell p-4">
                <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("exams.kind")}
                </p>
                <p class="mono mt-2 text-3xl font-semibold tabular-nums">{examKindCount()}</p>
                <p class="mt-1 text-xs text-muted-foreground">{t("courses.exams")}</p>
              </div>

              <div class="data-shell p-4">
                <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  {t("terms.term")}
                </p>
                <p class="mono mt-2 truncate text-xl font-semibold">
                  {terms()?.find((term) => term.id === c().term)?.name ?? t("terms.unassigned")}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">{t("terms.title")}</p>
              </div>
            </section>

            <SectionDisclosure
              open={openSections().exams}
              onToggle={() => toggleSection("exams")}
              title={t("courses.exams")}
              description={`${examCount()} ${t("nav.exams")}`}
              meta={<Badge variant="secondary" class="rounded-lg px-3 py-1"><span class="mono tabular-nums">{examCount()}</span><span class="ml-1">{t("nav.exams")}</span></Badge>}
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
                <Show
                  when={(exams() ?? []).length > 0}
                  fallback={
                    <div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("exams.empty")}
                    </div>
                  }
                >
                  <ul class="space-y-2">
                    <For each={exams() ?? []}>
                      {(exam) => (
                        <li>
                          <ExamLink
                            examId={exam.id}
                            class="group flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/35 hover:bg-muted/40"
                          >
                            <div class="min-w-0 space-y-2">
                              <div>
                                <p class="truncate font-medium group-hover:text-primary">{exam.title}</p>
                              </div>
                              <div class="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" class="rounded-sm capitalize">
                                  {examKindLabel(String(exam.kind), t)}
                                  <Show when={examWeight(exam, settings()?.exam_kinds) != null}>
                                    {(weight) => <span class="ml-1 text-muted-foreground">({t("courses.weight")}: {weight()})</span>}
                                  </Show>
                                </Badge>
                                <Badge variant="secondary" class="rounded-sm">
                                  {examModeLabel(exam.mode)}
                                </Badge>
                              </div>
                            </div>
                          </ExamLink>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Suspense>
            </SectionDisclosure>

            <SectionDisclosure
              open={openSections().sessions}
              onToggle={() => toggleSection("sessions")}
              title={t("sessions.title")}
              description={t("sessions.subtitle")}
              meta={<Badge variant="secondary" class="rounded-lg px-3 py-1">{t("sessions.title")}</Badge>}
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
              />
            </SectionDisclosure>

            <Show when={hasCourseManagementRights()}>
              <SectionDisclosure
                open={openSections().roster}
                onToggle={() => toggleSection("roster")}
                title={t("courses.roster")}
                description={t("courses.enroll")}
                meta={<Badge variant="secondary" class="rounded-lg px-3 py-1"><span class="mono tabular-nums">{rosterCount()}</span><span class="ml-1">{t("courses.roster")}</span></Badge>}
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
                      <div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.emptyRoster")}
                      </div>
                    }
                  >
                    <DataTableFrame>
                      <Table class="data-table">
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.username")}</TableHead>
                            <TableHead>{t("admin.id")}</TableHead>
                            <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <For each={roster() ?? []}>
                            {(row) => (
                              <TableRow>
                                <TableCell class="font-medium">
                                  {row.user.display_name || row.user.username}
                                </TableCell>
                                <TableCell class="mono text-xs text-muted-foreground">
                                  {row.user.id}
                                </TableCell>
                                <TableCell class="px-1 text-center">
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
                                              userId: row.user.id,
                                              userName: row.user.display_name || row.user.username,
                                            }),
                                        },
                                      ]}
                                    />
                                  </Show>
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
          </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
