import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getCourseById, getCourseSubjects, getCourses, postCourseHomework } from "@/api/courses";
import { getHomework } from "@/api/homework";
import { getSubjectById } from "@/api/subjects";
import { getTime } from "@/api/time";
import { formatApiError } from "@/api/client";
import type { Course, Homework } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
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

export default function HomeworkPage() {
  return (
    <RouteGuard>
      <HomeworkContent />
    </RouteGuard>
  );
}

function HomeworkContent() {
  const t = useT();
  const auth = useAuth();
  const { locale } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const [createOpen, setCreateOpen] = createSignal(location().searchStr.includes("action=new"));
  createEffect(() => {
    if (location().searchStr.includes("action=new")) {
      setCreateOpen(true);
    }
  });
  const [selectedCourseId, setSelectedCourseId] = createSignal("");
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [subjectId, setSubjectId] = createSignal("");
  const [dueDate, setDueDate] = createSignal("");
  const [dueTime, setDueTime] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [courseNames, setCourseNames] = createSignal<Record<string, string>>({});
  const [subjectNames, setSubjectNames] = createSignal<Record<string, string>>({});
  const [list, { refetch }] = createResource(async () => {
    const items = (await getHomework({ limit: 100 })).items;
    const courses = [...new Set(items.map((item) => item.course))];
    const subjects = [...new Set(items.map((item) => item.subject))];
    await Promise.all(courses.map((id) => getCourseById(id).then((course) => setCourseNames((current) => ({ ...current, [id]: course.title }))).catch(() => {})));
    await Promise.all(subjects.map((id) => getSubjectById(id).then((subject) => setSubjectNames((current) => ({ ...current, [id]: subject.name }))).catch(() => {})));
    return items;
  });
  const [courses] = createResource(
    () => (hasMinRole(auth.user()?.role, "teacher") ? true : null),
    async (enabled) => (enabled ? (await getCourses({ limit: 100 })).items : []),
  );
  const manageableCourses = createMemo(() => (courses() ?? []).filter((course: Course) => {
    const user = auth.user();
    if (!user) return false;
    return course.creator.id === user.id || (course.teachers ?? []).some((teacher) => teacher.id === user.id) || hasMinRole(user.role, "manager");
  }));
  const [subjects] = createResource(
    () => selectedCourseId() || null,
    async (courseId) => (courseId ? (await getCourseSubjects(courseId)).items : []),
  );
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const courseName = (id: string) => courseNames()[id] ?? id;
  const subjectName = (id: string) => subjectNames()[id] ?? id;
  const canCreate = () => manageableCourses().length > 0;
  const pageTitle = () => auth.user()?.role === "student" ? t("homework.mineTitle") : t("homework.title");

  createEffect(() => {
    if (!createOpen()) return;
    if (!selectedCourseId()) setSelectedCourseId(manageableCourses()[0]?.id ?? "");
  });

  createEffect(() => {
    setSubjectId(subjects()?.[0]?.id ?? "");
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedCourseId(manageableCourses()[0]?.id ?? "");
    setSubjectId("");
    setDueDate("");
    setDueTime("");
    setError("");
  };

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    const due_at = dateInputToMs(dueDate(), dueTime());
    if (!selectedCourseId()) return setError(t("exams.missingCourse"));
    if (!subjectId()) return setError(t("subjects.select"));
    if (due_at == null) return setError(t("homework.dueRequired"));
    if (due_at < (serverTime()?.now ?? Date.now())) return setError(t("form.timePast"));
    setPending(true);
    try {
      await postCourseHomework(selectedCourseId(), {
        title: title().trim(),
        description: description().trim() || null,
        subject_id: subjectId(),
        due_at,
      });
      resetForm();
      setCreateOpen(false);
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
      cell: (cell) => (
        <div class="min-w-0">
          <p class="truncate font-medium">{cell.row.original.title}</p>
          <p class="truncate text-xs text-muted-foreground">{cell.row.original.description || "—"}</p>
        </div>
      ),
    },
    {
      id: "course",
      accessorFn: (row) => courseName(row.course),
      header: t("nav.courses"),
      meta: { cellClass: "text-muted-foreground" },
      cell: (cell) => courseName(cell.row.original.course),
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
      meta: { cellClass: "mono whitespace-nowrap text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.due_at, locale()),
    },
    {
      id: "assigned",
      accessorFn: (row) => row.assigned?.length ?? 0,
      header: t("homework.assigned"),
      cell: (cell) => cell.row.original.assigned?.length ? t("common.countItem", { count: cell.row.original.assigned.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse"),
    },
  ]);

  return (
    <div class="space-y-6">
      <PageHeader
        accent="amber"
        eyebrow={t("nav.group.classes")}
        title={pageTitle()}
        description={t("homework.listHelp")}
        actions={
          <Show when={canCreate()}>
            <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setCreateOpen(true)}>
              <IconPlus class="h-4 w-4" />
              {t("homework.add")}
            </Button>
          </Show>
        }
      />
      <SidePanel open={createOpen()} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }} title={t("homework.add")} description={t("homework.help")}>
        <form class="space-y-4" onSubmit={(event) => void save(event)}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="homework-course">{t("nav.courses")}</Label>
            <Select id="homework-course" required value={selectedCourseId()} onChange={(event) => setSelectedCourseId(event.currentTarget.value)}>
              <For each={manageableCourses()}>{(course) => <option value={course.id}>{course.title}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="homework-subject-global">{t("subjects.subject")}</Label>
            <Select id="homework-subject-global" required value={subjectId()} onChange={(event) => setSubjectId(event.currentTarget.value)}>
              <For each={subjects() ?? []}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
            </Select>
          </div>
          <div class="space-y-1.5">
            <Label for="homework-title-global">{t("form.title")}</Label>
            <Input id="homework-title-global" required maxlength={200} value={title()} onInput={(event) => setTitle(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="homework-description-global">{t("form.description")}</Label>
            <Textarea id="homework-description-global" maxlength={2000} rows={3} value={description()} onInput={(event) => setDescription(event.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="homework-due-global">{t("homework.dueAt")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker id="homework-due-global" class="h-10" placeholder={t("form.datePlaceholder")} value={dueDate()} required onChange={setDueDate} />
              <Input class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/35" placeholder="17:00" value={dueTime()} required onInput={(event) => setDueTime(event.currentTarget.value)} />
            </div>
          </div>
          <p class="rounded-xl border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">{t("homework.wholeCourseHelp")}</p>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-xl" disabled={pending()}>{t("common.create")}</Button>
            <Button type="button" variant="outline" class="rounded-xl" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>
      <Suspense fallback={<DataTableSkeleton />}>
        <Show when={list.error}>
          <Alert variant="destructive">{formatApiError(list.error)}</Alert>
        </Show>
        <DataTable columns={columns()} data={list() ?? []} filterColumn="title" enablePagination pageSize={12} empty={t("homework.empty")} onRowClick={(item) => void navigate({ to: "/homework/$id", params: { id: item.id } })} />
      </Suspense>
    </div>
  );
}
