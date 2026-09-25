import { Show, Suspense, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getInstanceSubjects, postInstanceHomework } from "@/api/instances";
import { loadInstanceOptions } from "@/lib/instance-options";
import { loadInstanceLabels } from "@/lib/instance-labels";
import { getHomework } from "@/api/homework";
import { getTime } from "@/api/time";
import { formatApiError } from "@/api/client";
import type { Homework } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { IconEye, IconPlus, IconRotateCcw } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { DropdownSelect } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { hasMinRole } from "@/lib/roles";
import { createUrlString } from "@/lib/url-state";
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
  // Homework is filed against an instance (şube × ders): the same ders taught
  // in two şubeler yields rows with the same title, so a row's label names
  // both — "<ders> — <şube>", as the exams list does.
  const [courseNames, setCourseNames] = createSignal<Record<string, string>>({});
  const [list, { refetch }] = createResource(async () => {
    const items = (await getHomework({ limit: 100 })).items;
    const labels = await loadInstanceLabels(items.map((item) => item.class_course), auth.user()?.role);
    setCourseNames(Object.fromEntries([...labels].map(([id, entry]) => [id, entry.label])));
    return items;
  });
  // The caller's sections, labelled "<ders> — <şube>" and ordered class by
  // class: the şube filter lists them all, the create form only for teachers.
  const [instances] = createResource(
    () => auth.user()?.role ?? null,
    (role) => loadInstanceOptions(role ?? undefined),
  );
  const manageableCourses = createMemo(() => (hasMinRole(auth.user()?.role, "teacher") ? instances() ?? [] : []));
  // The şube filter, as on /exams; it lives in the URL beside the table's own
  // search and page.
  const [courseFilter, setCourseFilter] = createUrlString("course", "all");
  const courseFilterOptions = createMemo(() => {
    const known = instances() ?? [];
    const knownIds = new Set(known.map((row) => row.id));
    // Homework in a şube the picker does not list (e.g. one the caller only
    // sees through an assignment) still gets its own entry, after the rest.
    const extra = [...new Set((list() ?? []).map((item) => item.class_course))]
      .filter((id) => !knownIds.has(id) && courseNames()[id])
      .map((id) => ({ value: id, label: courseNames()[id] }));
    return [{ value: "all", label: t("common.all") }, ...known.map((row) => ({ value: row.id, label: row.label })), ...extra];
  });
  // A homework subject must sit in the chosen section's resolved subject set.
  const [subjects] = createResource(
    () => selectedCourseId() || null,
    async (instanceId) => (instanceId ? (await getInstanceSubjects(instanceId)).subjects : []),
  );
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const courseName = (id: string) => courseNames()[id] ?? "—";
  const canCreate = () => manageableCourses().length > 0;
  const pageTitle = () => auth.user()?.role === "student" ? t("homework.mineTitle") : t("homework.title");
  type DueTab = "all" | "open" | "past";
  const [dueTab, setDueTab] = createSignal<DueTab>("all");
  const dueFilteredList = createMemo(() => {
    const now = serverTime()?.now ?? Date.now();
    const items = (list() ?? []).filter((item) => courseFilter() === "all" || item.class_course === courseFilter());
    if (dueTab() === "open") return items.filter((item) => item.due_at >= now);
    if (dueTab() === "past") return items.filter((item) => item.due_at < now);
    return items;
  });

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
      await postInstanceHomework(selectedCourseId(), {
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
      size: 220,
      minSize: 180,
      meta: { cellClass: "font-medium" },
      cell: (cell) => (
        <span class="block truncate font-medium" title={cell.row.original.title}>{cell.row.original.title}</span>
      ),
    },
    {
      id: "course",
      accessorFn: (row) => courseName(row.class_course),
      header: t("nav.courses"),
      size: 180,
      minSize: 140,
      meta: { cellClass: "max-w-0 truncate text-text-subtle" },
      cell: (cell) => <span class="block truncate" title={courseName(cell.row.original.class_course)}>{courseName(cell.row.original.class_course)}</span>,
    },
    {
      id: "due_at",
      accessorFn: (row) => row.due_at,
      header: t("homework.dueAt"),
      size: 150,
      minSize: 130,
      meta: { cellClass: "whitespace-nowrap text-text-subtle" },
      cell: (cell) => formatDateTime(cell.row.original.due_at, locale()),
    },
    {
      id: "assigned",
      accessorFn: (row) => row.assigned?.length ?? 0,
      header: t("homework.assigned"),
      size: 150,
      minSize: 120,
      cell: (cell) => cell.row.original.assigned?.length ? t("common.countItem", { count: cell.row.original.assigned.length, item: t("courses.rosterItem") }) : t("homework.wholeCourse"),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[{
            label: t("common.view"),
            icon: <IconEye class="h-4 w-4" />,
            onSelect: () => void navigate({ to: "/homework/$id", params: { id: cell.row.original.id } }),
          }]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <SidePanel guardUnsaved open={createOpen()} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }} title={t("homework.add")} description={t("homework.help")}>
        <form class="space-y-4" onSubmit={(event) => void save(event)}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="homework-course">{t("instances.selectSection")}</Label>
            <SearchableSelect id="homework-course" required value={selectedCourseId()} onChange={setSelectedCourseId} placeholder={t("exams.selectCourse")} options={manageableCourses().map((row) => ({ value: row.id, label: row.label }))} />
          </div>
          <div class="space-y-1.5">
            <Label for="homework-subject-global">{t("subjects.subject")}</Label>
            <SearchableSelect id="homework-subject-global" required value={subjectId()} onChange={setSubjectId} placeholder={t("subjects.select")} options={(subjects() ?? []).map((subject) => ({ value: subject.id, label: subject.name }))} />
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
              <DatePicker id="homework-due-global" class="h-9" placeholder={t("form.datePlaceholder")} value={dueDate()} required onChange={setDueDate} />
              <Input class="h-9 rounded-md font-mono placeholder:text-text-placeholder" placeholder="17:00" value={dueTime()} required onInput={(event) => setDueTime(event.currentTarget.value)} />
            </div>
          </div>
          <p class="rounded-xl border border-border-line bg-surface-tint px-3 py-2 text-xs text-text-subtle">{t("homework.wholeCourseHelp")}</p>
          <div class="flex flex-wrap gap-2">
            <Button type="submit" class="rounded-lg" disabled={pending()}>{t("common.create")}</Button>
            <Button type="button" variant="outline" class="rounded-lg" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>
      <Tabs value={dueTab()} onChange={(value) => setDueTab(value as DueTab)}>
        <TabsList aria-label={pageTitle()}>
          <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
          <TabsTrigger value="open">{t("homework.tab.open")}</TabsTrigger>
          <TabsTrigger value="past">{t("homework.tab.past")}</TabsTrigger>
        </TabsList>

        <TabsContent value={dueTab()} class="mt-4 border-0 bg-transparent p-0 shadow-none">
          <Suspense fallback={<DataTableSkeleton columns={5} rows={8} />}>
            <Show when={list.error}>
              <Alert variant="destructive">{formatApiError(list.error)}</Alert>
            </Show>
            <DataTable
              urlState
              columns={columns()}
              data={dueFilteredList()}
              tableClass="table-fixed min-w-[44rem]"
              filterColumn="title"
              filterHint={t("search.hint.homework")}
              enablePagination
              pageSize={10}
              empty={t("homework.empty")}
              storageKey="homework"
              pageResetKey={`${dueTab()}|${courseFilter()}`}
              filtersActive={courseFilter() !== "all"}
              onClearFilters={() => setCourseFilter("all")}
              filters={
                <div class="flex flex-wrap items-center gap-2.5">
                  <DropdownSelect
                    labelPrefix={t("nav.courses")}
                    value={courseFilter()}
                    onChange={(val) => setCourseFilter(val)}
                    options={courseFilterOptions()}
                  />
                  <Show when={courseFilter() !== "all"}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      class="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => setCourseFilter("all")}
                    >
                      <IconRotateCcw class="mr-1 h-3.5 w-3.5" />
                      {t("common.resetFilters")}
                    </Button>
                  </Show>
                </div>
              }
              actions={
                <Show when={canCreate()}>
                  <Button type="button" size="sm" class="rounded-lg" onClick={() => setCreateOpen(true)}>
                    <IconPlus class="h-4 w-4" />
                    {t("homework.add")}
                  </Button>
                </Show>
              }
              onRowClick={(item) => void navigate({ to: "/homework/$id", params: { id: item.id } })}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
