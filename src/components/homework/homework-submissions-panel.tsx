import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getCourseEnrollments } from "@/api/courses";
import { deleteHomeworkResultByUserId, getHomeworkRosterSubmissionFileUrl, getHomeworkSubmissions, postHomeworkResult } from "@/api/homework";
import { formatApiError } from "@/api/client";
import type { HomeworkRosterEntry } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconDownload, IconEdit, IconEye, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { formatBytes } from "@/lib/upload-limits";
import { usePreferences, useT } from "@/stores/preferences-context";

export function HomeworkSubmissionsPanel(props: { homeworkId: string; courseId: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const [gradeTarget, setGradeTarget] = createSignal<HomeworkRosterEntry | null>(null);
  const [viewTarget, setViewTarget] = createSignal<HomeworkRosterEntry | null>(null);
  const [removeTarget, setRemoveTarget] = createSignal<HomeworkRosterEntry | null>(null);
  const [status, setStatus] = createSignal("done");
  const [mark, setMark] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();
  const [submissions, { refetch }] = createResource(
    () => props.homeworkId,
    async (id) => getHomeworkSubmissions(id, { limit: 200 }),
  );
  const [enrollments] = createResource(
    () => props.courseId,
    async (courseId) => (await getCourseEnrollments(courseId)).items,
  );
  const studentLabel = (userId: string) => {
    const user = (enrollments() ?? []).find((row) => row.user.id === userId)?.user;
    return user?.username ?? userId;
  };

  const openGrade = (row: HomeworkRosterEntry) => {
    setGradeTarget(row);
    setStatus(row.result?.status ?? (row.missing ? "missing" : "done"));
    setMark(row.result?.mark == null ? "" : String(row.result.mark));
    setError("");
  };
  const closeGrade = () => {
    setGradeTarget(null);
    setError("");
  };
  const statusLabel = (value: string) => {
    if (value === "done") return t("homework.status.done");
    if (value === "incomplete") return t("homework.status.incomplete");
    if (value === "missing") return t("homework.status.missing");
    return value;
  };
  const saveGrade = async (event: SubmitEvent) => {
    event.preventDefault();
    const target = gradeTarget();
    if (!target) return;
    const numericMark = mark().trim() === "" ? null : Number(mark());
    if (numericMark != null && (!Number.isFinite(numericMark) || numericMark < 0 || numericMark > 100)) {
      setError(t("form.markRange"));
      return;
    }
    setPending(true);
    setError("");
    try {
      await postHomeworkResult(props.homeworkId, { user: target.user, status: status(), mark: numericMark });
      await refetch();
      setFlash(t("common.saved"));
      closeGrade();
    } catch (err) {
      setError(formatApiError(err, locale()));
    } finally {
      setPending(false);
    }
  };
  const columns = createMemo<ColumnDef<HomeworkRosterEntry>[]>(() => [
    {
      id: "user",
      accessorFn: (row) => studentLabel(row.user),
      header: t("homework.student"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => studentLabel(cell.row.original.user),
    },
    {
      id: "submitted",
      header: t("homework.submission"),
      cell: (cell) => (
        <Show when={cell.row.original.submission} fallback={<Badge variant="outline" class="rounded-full">{t("homework.notSubmitted")}</Badge>}>
          {(submission) => (
            <div class="space-y-1">
              <Badge variant="secondary" class="rounded-full">{t("homework.submitted")}</Badge>
              <p class="text-xs text-muted-foreground">{formatDateTime(submission().updated_at, locale())}</p>
              <Show when={submission().late}><p class="text-xs text-amber-600">{t("homework.late")}</p></Show>
            </div>
          )}
        </Show>
      ),
    },
    {
      id: "result",
      header: t("homework.result"),
      cell: (cell) => (
        <Show when={cell.row.original.result} fallback={<span class="text-muted-foreground">—</span>}>
          {(result) => (
            <div class="space-y-1">
              <Badge variant="outline" class="rounded-full">{statusLabel(result().status)}</Badge>
              <Show when={result().mark != null}><p class="text-sm font-medium">{result().mark}/100</p></Show>
            </div>
          )}
        </Show>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            ...(cell.row.original.submission
              ? [{ label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setViewTarget(cell.row.original) }]
              : []),
            { label: t("homework.grade"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => openGrade(cell.row.original) },
            ...(cell.row.original.result
              ? [{ label: t("homework.ungrade"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setRemoveTarget(cell.row.original) }]
              : []),
          ]}
        />
      ),
    },
  ]);

  return (
    <section class="surface-card space-y-4 p-5">
      <div>
        <h2 class="font-display text-lg font-semibold">{t("homework.submissions")}</h2>
        <p class="mt-1 text-sm text-muted-foreground">{t("homework.submissionsHelp")}</p>
      </div>
      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <Show when={error() && !gradeTarget()}><Alert variant="destructive">{error()}</Alert></Show>
      <Suspense fallback={<DataTableSkeleton />}>
        <Show when={submissions.error}><Alert variant="destructive">{formatApiError(submissions.error, locale())}</Alert></Show>
        <DataTable columns={columns()} data={submissions()?.items ?? []} filterColumn="user" enablePagination pageSize={10} empty={t("common.noResults")} />
      </Suspense>
      <SidePanel open={gradeTarget() != null} onOpenChange={(open) => !open && closeGrade()} title={t("homework.grade")} description={gradeTarget() ? studentLabel(gradeTarget()!.user) : ""}>
        <form class="space-y-4" onSubmit={(event) => void saveGrade(event)}>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="space-y-1.5">
            <Label for="homework-grade-status">{t("events.status")}</Label>
            <Select id="homework-grade-status" value={status()} onChange={(event) => setStatus(event.currentTarget.value)}>
              <option value="done">{t("homework.status.done")}</option>
              <option value="incomplete">{t("homework.status.incomplete")}</option>
              <option value="missing">{t("homework.status.missing")}</option>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="homework-grade-mark">{t("form.mark")}</Label>
            <Input id="homework-grade-mark" type="number" min="0" max="100" value={mark()} onInput={(event) => setMark(event.currentTarget.value)} />
          </div>
          <div class="flex gap-2">
            <Button type="submit" class="rounded-lg" disabled={pending()}>{t("common.save")}</Button>
            <Button type="button" variant="outline" class="rounded-lg" onClick={closeGrade}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>
      <SidePanel open={viewTarget() != null} onOpenChange={(open) => !open && setViewTarget(null)} title={t("homework.submission")} description={viewTarget() ? studentLabel(viewTarget()!.user) : ""}>
        <Show when={viewTarget()?.submission}>
          {(submission) => (
            <div class="space-y-4">
              <div class="rounded-lg border bg-muted/20 p-3">
                <p class="text-xs text-muted-foreground">{t("exams.textAnswer")}</p>
                <p class="mt-2 whitespace-pre-wrap text-sm">{submission().text || t("homework.noAnswer")}</p>
              </div>
              <div class="space-y-2 rounded-lg border bg-background/70 p-3">
                <p class="text-sm font-medium">{t("notes.files")}</p>
                <Show when={submission().files.length > 0} fallback={<p class="text-sm text-muted-foreground">{t("notes.noFiles")}</p>}>
                  <ul class="space-y-2">
                    <For each={submission().files}>
                      {(file) => (
                        <li class="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
                          <div class="min-w-0">
                            <p class="truncate font-medium">{file.name}</p>
                            <p class="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                          </div>
                          <a href={getHomeworkRosterSubmissionFileUrl(props.homeworkId, viewTarget()!.user, file.id)} download={file.name}>
                            <Button type="button" size="sm" variant="ghost" class="rounded-lg">
                              <IconDownload class="h-4 w-4" />
                              {t("notes.downloadFile")}
                            </Button>
                          </a>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </SidePanel>
      <ConfirmDialog
        open={removeTarget() != null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title={t("confirm.removeResult")}
        variant="destructive"
        summary={removeTarget() ? studentLabel(removeTarget()!.user) : ""}
        onConfirm={async () => {
          const target = removeTarget();
          if (!target) return;
          try {
            await deleteHomeworkResultByUserId(props.homeworkId, target.user);
            await refetch();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err, locale()));
          } finally {
            setRemoveTarget(null);
          }
        }}
      />
    </section>
  );
}
