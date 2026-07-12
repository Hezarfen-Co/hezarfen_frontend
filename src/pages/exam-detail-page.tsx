import { Link, useNavigate, useParams } from "@tanstack/solid-router";
import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteExamById } from "@/api/deleteExamById";
import { deleteExamResultByUserId } from "@/api/deleteExamResultByUserId";
import { getExamById } from "@/api/getExamById";
import { getExamResult } from "@/api/getExamResult";
import { getExamResults } from "@/api/getExamResults";
import { patchExamById } from "@/api/patchExamById";
import { postExamResult } from "@/api/postExamResult";
import { ApiError, formatApiError } from "@/api/client";
import { ExamForm } from "@/components/exams/exam-form";
import { ExamQuestionsPanel } from "@/components/exams/exam-questions-panel";
import { ExamResultBadge } from "@/components/exams/exam-result-badge";
import { GradeForm } from "@/components/exams/grade-form";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconChevronLeft, IconEdit, IconExam, IconTrash } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasMinRole } from "@/lib/roles";
import { examDurationMs, formatDateTime, formatDurationMinutes } from "@/lib/format";
import { useAuth } from "@/stores/auth-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function ExamDetailPage() {
  return (
    <RouteGuard>
      <ExamDetailContent />
    </RouteGuard>
  );
}

function ExamDetailContent() {
  const params = useParams({ from: "/exams/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = usePreferences();
  const id = () => params().id;

  const [exam, { refetch: refetchExam }] = createResource(id, (examId) => getExamById(examId));
  const isTeacherPlus = createMemo(() => hasMinRole(auth.user()?.role, "teacher"));

  const [ownResult] = createResource(
    () => (!isTeacherPlus() ? id() : null),
    async (examId) => {
      if (!examId) return null;
      try {
        return await getExamResult(examId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  );

  const [results, { refetch: refetchResults }] = createResource(
    () => (isTeacherPlus() ? id() : null),
    async (examId) => {
      if (!examId) return [];
      return getExamResults(examId);
    },
  );

  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeUserId, setRemoveUserId] = createSignal<string | null>(null);

  const canManage = () => {
    const e = exam();
    const u = auth.user();
    if (!e || !u) return false;
    return e.creator === u.id || hasMinRole(u.role, "manager");
  };

  const examModeLabel = (mode: string | null) => {
    if (mode === "sync") return t("exams.mode.sync");
    if (mode === "async") return t("exams.mode.async");
    return t("exams.unscheduled");
  };
  const isScheduled = () => exam()?.mode === "sync" || exam()?.mode === "async";

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

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={exam()}
        fallback={
          <Show when={exam.error}>
            <Alert variant="destructive">
              {exam.error instanceof ApiError ? exam.error.message : t("common.notFound")}
            </Alert>
          </Show>
        }
      >
        {(ex) => (
          <div class="space-y-6">
            <PageHeader
              accent="rose"
              eyebrow={t("exams.title")}
              title={ex().title}
              description={ex().description || "—"}
              actions={
                <div class="flex flex-wrap items-center gap-1 rounded-md border bg-background/70 p-1 shadow-sm">
                  <Link to="/exams">
                    <Button variant="ghost" size="sm" class="rounded-sm">
                      <IconChevronLeft class="h-4 w-4" />
                      {t("common.back")}
                    </Button>
                  </Link>
                  <Show when={ex().mode === "sync" || ex().mode === "async"}>
                    <Link to="/exam-room/$id" params={{ id: id() }}>
                      <Button size="sm" class="rounded-sm">
                        <IconExam class="h-4 w-4" />
                        {t("attempt.openRoom")}
                      </Button>
                    </Link>
                  </Show>
                  <Show when={canManage()}>
                    <div class="ml-1 flex items-center gap-1 border-l pl-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        class="rounded-sm"
                        onClick={() => setEditing((v) => !v)}
                      >
                        <IconEdit class="h-4 w-4" />
                        {editing() ? t("common.cancel") : t("common.edit")}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending()}
                        onClick={() => setDeleteOpen(true)}
                      >
                        <IconTrash class="h-4 w-4" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </Show>
                </div>
              }
            >
              <div class="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="outline" class="rounded-sm capitalize">
                  {ex().kind}
                </Badge>
                <Badge variant="outline" class="rounded-sm">
                  {t("courses.weight")}: {ex().weight}
                </Badge>
                <Badge variant="outline" class="rounded-sm">
                  {examModeLabel(ex().mode)}
                </Badge>
              </div>
            </PageHeader>

            <ConfirmDialog
              open={deleteOpen()}
              onOpenChange={setDeleteOpen}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.deleteExam", { title: ex().title })}
              onConfirm={async () => {
                await wrap(async () => {
                  await deleteExamById(id());
                  void navigate({ to: "/exams" });
                });
              }}
            />

            <Show when={editing()}>
              <section class="surface-card max-w-2xl p-5">
                <ExamForm
                  initial={ex()}
                  submitLabel={t("common.update")}
                  onCancel={() => setEditing(false)}
                  onSubmit={async (values) => {
                    await patchExamById(id(), values);
                    setEditing(false);
                    await refetchExam();
                  }}
                />
              </section>
            </Show>

            <section class="surface-card p-5">
              <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.schedule")}</h2>
              <div class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("exams.mode")}</p>
                  <p class="mt-1 font-medium">{examModeLabel(ex().mode)}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("events.starts")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ex().starts_at, locale())}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("events.ends")}</p>
                  <p class="mt-1 font-medium">{formatDateTime(ex().ends_at, locale())}</p>
                </div>
                <div class="rounded-md border p-3">
                  <p class="text-xs text-muted-foreground">{t("exams.durationMinutes")}</p>
                  <p class="mt-1 font-medium">{formatDurationMinutes(examDurationMs(ex().duration_ms, ex().starts_at, ex().ends_at))}</p>
                </div>
              </div>
            </section>

            <Show when={!isTeacherPlus() && !isScheduled()}>
              <section class="surface-card p-6">
                <h2 class="font-display text-lg font-semibold">{t("exams.yourResult")}</h2>
                <div class="mt-4">
                  <Suspense fallback={<PageSpinner />}>
                    <Show when={ownResult()} fallback={<ExamResultBadge notGraded />}>
                      {(r) => <ExamResultBadge mark={r().mark} />}
                    </Show>
                  </Suspense>
                </div>
              </section>
            </Show>

            <Show when={isTeacherPlus()}>
              <ExamQuestionsPanel examId={id()} />

              <section class="surface-card p-5">
                <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.gradeStudent")}</h2>
                <GradeForm
                  onSubmit={async (values) => {
                    await postExamResult(id(), values);
                    await refetchResults();
                  }}
                />
              </section>

              <section class="surface-card p-5">
                <h2 class="mb-4 font-display text-lg font-semibold">{t("exams.results")}</h2>
                <Suspense fallback={<PageSpinner />}>
                  <Show
                    when={(results() ?? []).length > 0}
                    fallback={
                      <p class="rounded-sm bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                        {t("exams.noResults")}
                      </p>
                    }
                  >
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("events.userId")}</TableHead>
                          <TableHead>{t("form.mark")}</TableHead>
                          <TableHead>{t("exams.gradedBy")}</TableHead>
                          <TableHead class="w-24" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <For each={results() ?? []}>
                          {(row) => (
                            <TableRow class="h-12">
                              <TableCell class="font-mono text-xs">{row.user}</TableCell>
                              <TableCell>
                                <ExamResultBadge mark={row.mark} />
                              </TableCell>
                              <TableCell class="font-mono text-xs">{row.graded_by}</TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => setRemoveUserId(row.user)}
                                >
                                  <IconTrash class="h-4 w-4" />
                                  {t("common.remove")}
                                </Button>
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

            {error() && (
              <p class="rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
            )}

            <ConfirmDialog
              open={removeUserId() != null}
              onOpenChange={(open) => {
                if (!open) setRemoveUserId(null);
              }}
              title={t("confirm.deleteTitle")}
              variant="destructive"
              summary={t("confirm.removeResult", { user: removeUserId() ?? "" })}
              onConfirm={async () => {
                const userId = removeUserId();
                if (!userId) return;
                await wrap(async () => {
                  await deleteExamResultByUserId(id(), userId);
                  await refetchResults();
                });
                setRemoveUserId(null);
              }}
            />
          </div>
        )}
      </Show>
    </Suspense>
  );
}
