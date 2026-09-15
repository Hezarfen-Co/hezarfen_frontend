import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteHomeworkById, patchHomeworkById } from "@/api/homework";
import { getCourseHomework, getCourseSubjects, postCourseHomework } from "@/api/courses";
import { getTime } from "@/api/time";
import { formatApiError } from "@/api/client";
import type { Homework, Subject } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

function dateInputToMs(date: string, time: string): number | null {
  const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, dayRaw, monthRaw, yearRaw] = dateMatch;
  const [, hourRaw, minuteRaw] = timeMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d.getHours() !== hour || d.getMinutes() !== minute) return null;
  return d.getTime();
}

function msToDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function msToTimeInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CourseHomeworkPanel(props: {
  courseId: string;
  canManage: boolean;
  active: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCountChange: (count: number) => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const navigate = useNavigate();
  const [homework, { refetch }] = createResource(
    () => (props.active ? props.courseId : null),
    async (courseId) => (courseId ? (await getCourseHomework(courseId)).items : []),
  );
  const [subjects] = createResource(
    () => (props.active ? props.courseId : null),
    async (courseId) => (courseId ? (await getCourseSubjects(courseId)).items : []),
  );
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const [editing, setEditing] = createSignal<Homework | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Homework | null>(null);
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [subjectId, setSubjectId] = createSignal("");
  const [dueDate, setDueDate] = createSignal("");
  const [dueTime, setDueTime] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const subjectName = (id: string) => subjects()?.find((subject) => subject.id === id)?.name ?? id;
  const resetForm = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setSubjectId(subjects()?.[0]?.id ?? "");
    setDueDate("");
    setDueTime("");
    setError("");
  };
  const openEdit = (item: Homework) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setSubjectId(item.subject);
    setDueDate(msToDateInput(item.due_at));
    setDueTime(msToTimeInput(item.due_at));
    setError("");
    props.onCreateOpenChange(true);
  };
  const setPanelOpen = (open: boolean) => {
    props.onCreateOpenChange(open);
    if (!open) resetForm();
  };

  createEffect(() => props.onCountChange(homework()?.length ?? 0));
  createEffect(() => {
    if (!subjectId()) setSubjectId(subjects()?.[0]?.id ?? "");
  });

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    const due_at = dateInputToMs(dueDate(), dueTime());
    if (due_at == null) {
      setError(t("homework.dueRequired"));
      return;
    }
    const current = editing();
    if ((!current || due_at !== current.due_at) && due_at < (serverTime()?.now ?? Date.now())) {
      setError(t("form.timePast"));
      return;
    }
    setPending(true);
    try {
      if (current) {
        await patchHomeworkById(current.id, {
          title: title().trim(),
          description: description().trim() || null,
          subject_id: subjectId(),
          due_at,
        });
        setFlash(t("common.saved"));
      } else {
        await postCourseHomework(props.courseId, {
          title: title().trim(),
          description: description().trim() || null,
          subject_id: subjectId(),
          due_at,
        });
        setFlash(t("common.created"));
      }
      setPanelOpen(false);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const columns = createMemo<ColumnDef<Homework>[]>(() => [
    {
      accessorKey: "title",
      header: t("form.title"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "subject",
      accessorFn: (row) => subjectName(row.subject),
      header: t("subjects.subject"),
      cell: (cell) => <Badge variant="outline" class="rounded-full">{subjectName(cell.row.original.subject)}</Badge>,
    },
    {
      id: "due_at",
      accessorFn: (row) => row.due_at,
      header: t("homework.dueAt"),
      meta: { cellClass: "mono text-xs text-text-subtle" },
      cell: (cell) => formatDateTime(cell.row.original.due_at, locale()),
    },
    {
      id: "assigned",
      accessorFn: (row) => row.assigned?.length ?? 0,
      header: t("homework.assigned"),
      cell: (cell) => cell.row.original.assigned?.length ? t("common.countItem", { count: cell.row.original.assigned.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse"),
    },
    ...(props.canManage
      ? [{
          id: "actions",
          header: t("common.actions"),
          meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap", cellClass: "px-1 text-center" },
          cell: (cell) => (
            <TableRowActions
              label={t("common.actions")}
              actions={[
                { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => openEdit(cell.row.original) },
                { label: t("common.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
              ]}
            />
          ),
        } satisfies ColumnDef<Homework>]
      : []),
  ]);

  return (
    <div class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !props.createOpen}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <Suspense fallback={<DataTableSkeleton />}>
        <Show when={(homework() ?? []).length > 0} fallback={<EmptyState kind="homework" title={t("homework.empty")} />}>
          <DataTable columns={columns()} data={homework() ?? []} filterColumn="title" enablePagination pageSize={10} empty={t("homework.empty")} onRowClick={(item) => void navigate({ to: "/homework/$id", params: { id: item.id } })} />
        </Show>
      </Suspense>

      <SidePanel open={props.createOpen} onOpenChange={setPanelOpen} title={editing() ? t("homework.edit") : t("homework.add")} description={t("homework.help")}>
        <form class="space-y-4" onSubmit={(event) => void save(event)}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="homework-title">{t("form.title")}</Label>
            <Input id="homework-title" required maxlength={200} value={title()} onInput={(event) => setTitle(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="homework-subject">{t("subjects.subject")}</Label>
            <Select id="homework-subject" required value={subjectId()} onChange={(event) => setSubjectId(event.currentTarget.value)}>
              <For each={subjects() ?? []}>{(subject: Subject) => <option value={subject.id}>{subject.name}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="homework-description">{t("form.description")}</Label>
            <Textarea id="homework-description" maxlength={2000} rows={3} value={description()} onInput={(event) => setDescription(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="homework-due-date">{t("homework.dueAt")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker id="homework-due-date" class="h-9" placeholder={t("form.datePlaceholder")} value={dueDate()} required onChange={setDueDate} />
              <Input class="h-9 rounded-md font-mono placeholder:text-text-placeholder" placeholder="17:00" value={dueTime()} required onInput={(event) => setDueTime(event.currentTarget.value)} />
            </div>
          </div>
          <p class="rounded-xl border border-border-line bg-surface-tint px-3 py-2 text-xs text-text-subtle">{t("homework.wholeCourseHelp")}</p>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-lg" disabled={pending() || (subjects() ?? []).length === 0}>{editing() ? t("common.update") : t("common.create")}</Button>
            <Button type="button" variant="outline" class="rounded-lg" onClick={() => setPanelOpen(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={deleteTarget()?.title ?? ""}
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          setError("");
          try {
            await deleteHomeworkById(target.id);
            await refetch();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
