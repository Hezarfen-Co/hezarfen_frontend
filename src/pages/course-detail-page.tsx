import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { Link, useNavigate, useParams } from "@tanstack/solid-router";
import { deleteCourseById } from "@/api/deleteCourseById";
import { deleteCourseEnrollmentByUserId } from "@/api/deleteCourseEnrollmentByUserId";
import { getCourseById } from "@/api/getCourseById";
import { getCourseEnrollments } from "@/api/getCourseEnrollments";
import { getCourseExams } from "@/api/getCourseExams";
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
import { IconPlus, IconTrash } from "@/components/ui/icons";
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

  const [editing, setEditing] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [showExamForm, setShowExamForm] = createSignal(false);
  const [enrollUserId, setEnrollUserId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);

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
                <div class="flex flex-wrap gap-2">
                  <Link to="/courses">
                    <Button variant="outline" size="sm">
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={canManage()}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => (editing() ? setEditing(false) : startEdit())}
                    >
                      {editing() ? t("common.cancel") : t("common.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <IconTrash class="h-4 w-4" />
                      {t("courses.delete")}
                    </Button>
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

            <Show when={editing()}>
              <form
                class="surface-card max-w-xl space-y-3 p-5"
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
                <Button type="submit" disabled={pending()}>
                  {t("common.update")}
                </Button>
              </form>
            </Show>

            {error() && (
              <p class="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            {/* Course exams */}
            <section class="surface-card space-y-4 p-5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <h2 class="font-display text-lg font-semibold">{t("courses.exams")}</h2>
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
                <div class="rounded-md border p-4">
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
                    <p class="text-sm text-muted-foreground">{t("exams.empty")}</p>
                  }
                >
                  <ul class="space-y-2">
                    <For each={exams() ?? []}>
                      {(exam) => (
                        <li>
                          <Link
                            to="/exams/$id"
                            params={{ id: exam.id }}
                            class="flex items-center justify-between gap-3 rounded-md border px-3 py-3 transition-colors hover:border-primary/30 hover:bg-accent/40"
                          >
                            <div class="min-w-0">
                              <p class="truncate font-medium">{exam.title}</p>
                              <p class="text-xs text-muted-foreground">
                                {t("courses.weight")}: {exam.weight} · {examModeLabel(exam.mode)}
                              </p>
                            </div>
                            <Badge variant="outline" class="capitalize">
                              {exam.kind}
                            </Badge>
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
                <h2 class="font-display text-lg font-semibold">{t("courses.roster")}</h2>
                <form
                  class="flex flex-col gap-2 sm:flex-row"
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
                  <Input
                    class="flex-1"
                    placeholder={t("events.userId")}
                    value={enrollUserId()}
                    onInput={(e) => setEnrollUserId(e.currentTarget.value)}
                  />
                  <Button type="submit" disabled={pending()}>
                    {t("courses.enroll")}
                  </Button>
                </form>

                <Suspense fallback={<PageSpinner />}>
                  <Show when={(roster() ?? []).length > 0} fallback={null}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("admin.username")}</TableHead>
                          <TableHead>{t("admin.id")}</TableHead>
                          <TableHead class="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={roster() ?? []}>
                          {(row) => (
                            <TableRow>
                              <TableCell class="font-medium">
                                {row.user.display_name || row.user.username}
                              </TableCell>
                              <TableCell class="font-mono text-xs">{row.user.id}</TableCell>
                              <TableCell>
                                <Show when={canManage()}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    class="text-destructive"
                                    onClick={() =>
                                      void wrap(async () => {
                                        await deleteCourseEnrollmentByUserId(id(), row.user.id);
                                        await refetchRoster();
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
