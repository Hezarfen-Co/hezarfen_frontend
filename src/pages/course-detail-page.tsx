import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { Link, useNavigate, useParams } from "@tanstack/solid-router";
import { deleteCourseById } from "@/api/deleteCourseById";
import { deleteCourseEnrollmentByUserId } from "@/api/deleteCourseEnrollmentByUserId";
import { getCourseById } from "@/api/getCourseById";
import { getCourseEnrollments } from "@/api/getCourseEnrollments";
import { getCourseExams } from "@/api/getCourseExams";
import { getUsers } from "@/api/getUsers";
import { patchCourseById } from "@/api/patchCourseById";
import { postCourseEnrollment } from "@/api/postCourseEnrollment";
import { postCourseExam } from "@/api/postCourseExam";
import { ApiError, formatApiError } from "@/api/client";
import { ExamForm } from "@/components/exams/exam-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronLeft, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { examKindLabel } from "@/lib/exam-labels";
import { hasMinRole } from "@/lib/roles";

export default function CourseDetailPage() {
  return (
    <RouteGuard>
      <CourseDetailContent />
    </RouteGuard>
  );
}

function CourseDetailContent() {
  const params = useParams({ from: "/courses/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const id = () => params().id;

  const [course, { refetch: refetchCourse }] = createResource(id, (courseId) => getCourseById(courseId));
  const [exams, { refetch: refetchExams }] = createResource(id, (courseId) => getCourseExams(courseId));
  const isTeacherPlus = () => hasMinRole(auth.user()?.role, "teacher");
  const [roster, { refetch: refetchRoster }] = createResource(
    () => (isTeacherPlus() ? id() : null),
    async (courseId) => (courseId ? getCourseEnrollments(courseId) : []),
  );
  const [users] = createResource(
    () => (hasMinRole(auth.user()?.role, "admin") ? true : null),
    async (enabled) => (enabled ? getUsers() : []),
  );

  const [editing, setEditing] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [showExamForm, setShowExamForm] = createSignal(false);
  const [enrollUserId, setEnrollUserId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeTarget, setRemoveTarget] = createSignal<{ userId: string; userName: string } | null>(null);

  const canManage = () => {
    const c = course();
    const u = auth.user();
    if (!c || !u) return false;
    return c.creator === u.id || hasMinRole(u.role, "manager");
  };

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };

  const examCount = createMemo(() => exams()?.length ?? 0);
  const rosterCount = createMemo(() => roster()?.length ?? 0);
  const totalWeight = createMemo(() => (exams() ?? []).reduce((sum, exam) => sum + exam.weight, 0));

  const enrollableUsers = () => {
    const enrolled = new Set((roster() ?? []).map((row) => row.user.id));
    return (users() ?? []).filter((user) => user.role === "student" && !enrolled.has(user.id));
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
    setEditing(true);
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={course()}
        fallback={
          <Show when={course.error}>
            <Alert variant="destructive">
              {course.error instanceof ApiError ? course.error.message : t("common.notFound")}
            </Alert>
          </Show>
        }
      >
        {(c) => (
          <div class="space-y-6">
            <PageHeader
              accent="violet"
              eyebrow={t("courses.title")}
              title={c().title}
              description={c().description || undefined}
              actions={
                <div class="flex w-full flex-wrap items-center gap-1 rounded-lg border bg-background/80 p-1 shadow-sm sm:w-auto">
                  <Link to="/courses">
                    <Button variant="ghost" size="sm" class="w-full rounded-md sm:w-auto">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={canManage()}>
                    <div class="flex flex-1 items-center gap-1 border-t border-border pt-1 sm:ml-1 sm:flex-none sm:border-l sm:border-t-0 sm:pl-1 sm:pt-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="flex-1 rounded-md sm:flex-none"
                        onClick={() => (editing() ? setEditing(false) : startEdit())}
                      >
                        <IconEdit class="h-4 w-4" />
                        {editing() ? t("common.cancel") : t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="flex-1 rounded-md sm:flex-none"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <IconTrash class="h-4 w-4" />
                        {t("courses.delete")}
                      </Button>
                    </div>
                  </Show>
                </div>
              }
            />

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

            <Show when={editing()}>
              <form
                class="surface-card max-w-2xl space-y-4 p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  void wrap(async () => {
                    await patchCourseById(id(), {
                      title: title().trim(),
                      description: description(),
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
                <div class="flex justify-end">
                  <Button type="submit" class="w-full sm:w-auto" disabled={pending()}>
                    {t("common.update")}
                  </Button>
                </div>
              </form>
            </Show>

            {error() && (
              <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <section class="grid gap-3 sm:grid-cols-3">
              <div class="surface-card bg-card/80 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("courses.exams")}
                </p>
                <p class="mt-2 font-display text-3xl font-semibold tabular-nums">{examCount()}</p>
                <p class="mt-1 text-xs text-muted-foreground">{t("nav.exams")}</p>
              </div>

              <Show when={isTeacherPlus()}>
                <div class="surface-card bg-card/80 p-4">
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("courses.roster")}
                  </p>
                  <p class="mt-2 font-display text-3xl font-semibold tabular-nums">{rosterCount()}</p>
                  <p class="mt-1 text-xs text-muted-foreground">{t("courses.enroll")}</p>
                </div>
              </Show>

              <div class="surface-card bg-card/80 p-4">
                <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("courses.weight")}
                </p>
                <p class="mt-2 font-display text-3xl font-semibold tabular-nums">{totalWeight()}</p>
                <p class="mt-1 text-xs text-muted-foreground">{t("marks.subtitle")}</p>
              </div>
            </section>

            {/* Course exams */}
            <section class="surface-card space-y-4 p-5">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="font-display text-lg font-semibold">{t("courses.exams")}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    {examCount()} {t("nav.exams")}
                  </p>
                </div>
                <Show when={canManage()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExamForm((v) => !v)}
                  >
                    <IconPlus class="h-4 w-4" />
                    {t("courses.addExam")}
                  </Button>
                </Show>
              </div>

              <Show when={showExamForm() && canManage()}>
                <div class="rounded-lg border bg-background/60 p-4">
                  <ExamForm
                    submitLabel={t("common.create")}
                    onSubmit={async (values) => {
                      await postCourseExam(id(), {
                        ...values,
                        description: values.description.trim() || undefined,
                      });
                      setShowExamForm(false);
                      await refetchExams();
                    }}
                  />
                </div>
              </Show>

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
                          <Link
                            to="/exams/$id"
                            params={{ id: exam.id }}
                            class="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/60 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/35 hover:shadow-sm"
                          >
                            <div class="min-w-0 space-y-2">
                              <div>
                                <p class="truncate font-medium group-hover:text-primary">{exam.title}</p>
                              </div>
                              <div class="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" class="rounded-full capitalize">
                                  {examKindLabel(String(exam.kind), t)}
                                </Badge>
                                <Badge variant="secondary" class="rounded-full">
                                  {examModeLabel(exam.mode)}
                                </Badge>
                              </div>
                            </div>
                            <div class="shrink-0 rounded-lg border bg-card px-3 py-2 text-center shadow-sm">
                              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {t("courses.weight")}
                              </p>
                              <p class="font-display text-xl font-semibold tabular-nums">{exam.weight}</p>
                            </div>
                          </Link>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </Suspense>
            </section>

            {/* Roster */}
            <Show when={isTeacherPlus()}>
              <section class="surface-card space-y-4 p-5">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="font-display text-lg font-semibold">{t("courses.roster")}</h2>
                  <Badge variant="secondary" class="rounded-full px-3 py-1">
                    {rosterCount()}
                  </Badge>
                </div>
                <form
                  class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void wrap(async () => {
                      const uid = enrollUserId().trim();
                      if (!uid) throw new Error(t("events.userId"));
                      await postCourseEnrollment(id(), uid);
                      setEnrollUserId("");
                      await refetchRoster();
                    });
                  }}
                >
                  <div class="min-w-0">
                    <Show
                      when={(users() ?? []).length > 0}
                      fallback={
                        <Input
                          class="h-10"
                          placeholder={t("events.userId")}
                          value={enrollUserId()}
                          onInput={(e) => setEnrollUserId(e.currentTarget.value)}
                        />
                      }
                    >
                      <Input
                        class="h-10"
                        list="enrollable-students"
                        placeholder={enrollableUsers().length === 0 ? t("form.noStudents") : t("form.selectStudent")}
                        value={enrollUserId()}
                        disabled={enrollableUsers().length === 0}
                        onInput={(e) => setEnrollUserId(e.currentTarget.value)}
                      />
                      <datalist id="enrollable-students">
                        <For each={enrollableUsers()}>
                          {(user) => <option value={user.id} label={`${user.username} · ${user.id}`} />}
                        </For>
                      </datalist>
                    </Show>
                  </div>
                  <Button type="submit" class="h-10" disabled={pending()}>
                    {t("courses.enroll")}
                  </Button>
                </form>

                <Suspense fallback={<PageSpinner />}>
                  <Show
                    when={(roster() ?? []).length > 0}
                    fallback={
                      <div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                        {t("exams.emptyRoster")}
                      </div>
                    }
                  >
                    <div class="overflow-hidden rounded-lg border border-border/70 bg-background/60">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("admin.username")}</TableHead>
                            <TableHead>{t("admin.id")}</TableHead>
                            <TableHead class="w-16 text-right" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <For each={roster() ?? []}>
                            {(row) => (
                              <TableRow>
                                <TableCell class="font-medium">
                                  {row.user.display_name || row.user.username}
                                </TableCell>
                                <TableCell class="font-mono text-xs text-muted-foreground">
                                  {row.user.id}
                                </TableCell>
                                <TableCell class="text-right">
                                  <Show when={canManage()}>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() =>
                                        setRemoveTarget({
                                          userId: row.user.id,
                                          userName: row.user.display_name || row.user.username,
                                        })
                                      }
                                    >
                                      <IconTrash class="h-4 w-4" />
                                    </Button>
                                  </Show>
                                </TableCell>
                              </TableRow>
                            )}
                          </For>
                        </TableBody>
                      </Table>
                    </div>
                  </Show>
                </Suspense>
              </section>
            </Show>
          </div>
        )}
      </Show>
    </Suspense>
  );
}
