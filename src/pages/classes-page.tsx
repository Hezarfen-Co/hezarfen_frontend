import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { createResource } from "@/lib/create-resource";
import { useNavigate } from "@tanstack/solid-router";
import { deleteClassById, getClasses, getClassMembers, postClass, postClassBlueprintApply } from "@/api/classes";
import { getAcademicYears } from "@/api/academic-years";
import { getCourses } from "@/api/courses";
import { getLimits } from "@/api/limits";
import { ApiError, formatApiError, type BlueprintSkip, type ClassGroup } from "@/api/client";
import { BlueprintSkippedReport } from "@/components/classes/blueprint-skipped-report";
import { ClassEditPanel } from "@/components/classes/class-edit-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RouteGuard } from "@/components/layout/route-guard";
import { DropdownSelect, Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconEdit, IconEye, IconListChecks, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlueprintsTab } from "@/components/classes/blueprints-tab";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { compareClasses } from "@/lib/student-directory";
import { createUrlString } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { GradeLevelSelect } from "@/components/classes/grade-level-select";
import { gradeLevelLabel } from "@/lib/grade-level";

// A class's member count has no aggregate field on ClassGroup and no bulk
// endpoint — each card's count is one `getClassMembers(id, {limit:1})` read
// for its `total`, same "N+1 bounded by the visible set" shape already used
// for payments roster balances and staff-work people. Capped so a school with
// an unusually large roster of classes doesn't fire hundreds of requests.
const MEMBER_COUNT_FETCH_CAP = 200;

export default function ClassesPage() {
  return <RouteGuard minRole="teacher"><ClassesContent /></RouteGuard>;
}

function ClassesContent() {
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const canManage = () => hasMinRole(auth.user()?.role, "manager");

  const [tab, setTab] = createSignal("classes");
  const [gradeFilter, setGradeFilter] = createUrlString("grade", "all");
  const [showForm, setShowForm] = createSignal(false);
  const [name, setName] = createSignal("");
  const [gradeLevel, setGradeLevel] = createSignal<number | null>(null);
  const [gradeError, setGradeError] = createSignal("");
  const [yearId, setYearId] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
  const [error, setError] = createSignal("");
  const [nameError, setNameError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  // A create whose grade's blueprint left pairs behind reports them here before
  // it opens the class: the response is the only place those rows ever appear.
  const [createdClass, setCreatedClass] = createSignal<ClassGroup | null>(null);
  const [skipped, setSkipped] = createSignal<BlueprintSkip[]>([]);
  const [skippedCourseTitles, setSkippedCourseTitles] = createSignal<Record<string, string>>({});
  const [reportOpen, setReportOpen] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const [years] = createResource(async () => (await getAcademicYears({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  // The grade filter narrows on the server now: the table fetch carries
  // `grade_level` and re-runs when the filter changes. An unreadable `?grade=`
  // (only possible by hand) falls back to unfiltered, like every URL param.
  const [list, { refetch }] = createResource(
    () => gradeFilter(),
    async (grade) => {
      const level = Number(grade);
      return (await getClasses(grade === "all" || !Number.isInteger(level) ? undefined : { grade_level: level })).items;
    },
  );
  // The dropdown's options must not collapse to the selected grade, so they
  // come from their own unfiltered read, not from the filtered table rows.
  const [gradeList, { refetch: refetchGrades }] = createResource(
    async () => (await getClasses({ limit: 200 })).items,
  );
  const courseTitle = (id: string) => skippedCourseTitles()[id] ?? "—";
  const listData = () => list.latest ?? list() ?? [];
  const gradeData = () => gradeList.latest ?? gradeList() ?? [];
  const yearName = (id: string | null) => (id ? years.latest?.find((year) => year.id === id)?.name ?? "—" : t("academicYears.unassigned"));

  // The grade filter offers only the rungs this school's classes sit on.
  const grades = createMemo(() => [...new Set(gradeData().map((cls) => cls.grade_level))].sort((a, b) => a - b));

  const memberCountIds = createMemo(() => {
    const ids = listData().map((cls) => cls.id);
    return ids.length > 0 && ids.length <= MEMBER_COUNT_FETCH_CAP ? ids : null;
  });
  const [memberCounts] = createResource(memberCountIds, async (ids) => {
    const entries = await mapConcurrent(ids, FAN_OUT_LIMIT, async (id) => {
      try {
        return [id, (await getClassMembers(id, { limit: 1 })).total] as const;
      } catch {
        return [id, null] as const;
      }
    });
    return new Map(entries);
  });
  // A memo: the columns read it, and must not rebuild on every list refetch.
  const memberCountsCapped = createMemo(() => listData().length > MEMBER_COUNT_FETCH_CAP);

  // Class by class (9-A, 9-B, 10-A…) until a column header re-sorts it. The
  // grade narrowing itself happens on the server.
  const gradeFiltered = createMemo(() => listData().slice().sort(compareClasses));
  // A fresh array once the member counts land: the table redraws a row only
  // when its data changes, so the counts would otherwise stay "—".
  const rows = createMemo(() => {
    memberCounts();
    return gradeFiltered().slice();
  });
  const openClass = (cls: ClassGroup) => void navigate({ to: "/management/classes/$id", params: { id: cls.id } });

  // The detail page's header actions, from the row menu: edit, apply the
  // grade's blueprint and delete — all manager+, as there.
  const [editTarget, setEditTarget] = createSignal<ClassGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<ClassGroup | null>(null);
  const [rowError, setRowError] = createSignal("");
  const refreshList = async () => {
    // The grade dropdown reads its own unfiltered page, so a create, edit or
    // delete that changes which rungs have classes must refresh it too.
    try { await Promise.all([refetch(), refetchGrades()]); } catch { /* stale rows until the next load */ }
  };
  // Applying is best-effort: the request succeeds and reports the pairs it
  // could not attach, so a shortfall opens the same report the create uses.
  const applyBlueprint = async (cls: ClassGroup) => {
    if (pending()) return;
    setRowError("");
    setPending(true);
    try {
      const result = await postClassBlueprintApply(cls.id);
      if (result.skipped.length === 0) {
        setFlash(t("classBlueprints.applied"));
        return;
      }
      try {
        const courses = (await getCourses({ limit: 200 })).items;
        setSkippedCourseTitles(Object.fromEntries(courses.map((course) => [course.id, course.title])));
      } catch {
        // The report still opens; the rows fall back to "—".
      }
      setSkipped(result.skipped);
      setReportOpen(true);
    } catch (err) {
      // A 404 here means no blueprint covers this grade, not a missing class.
      setRowError(err instanceof ApiError && err.status === 404
        ? t("classBlueprints.noBlueprintForGrade", { grade: gradeLevelLabel(cls.grade_level, t) })
        : formatApiError(err));
    } finally {
      setPending(false);
    }
  };
  const columns = createMemo<ColumnDef<ClassGroup>[]>(() => [
    {
      accessorKey: "name",
      header: t("classGroups.className"),
      size: 150,
      minSize: 120,
      meta: { cellClass: "max-w-0" },
      cell: (cell) => <span class="block truncate font-medium" title={cell.row.original.name}>{cell.row.original.name}</span>,
    },
    {
      id: "grade",
      accessorFn: (row) => row.grade_level,
      header: t("classGroups.grade"),
      size: 90,
      minSize: 80,
      meta: { cellClass: "whitespace-nowrap text-center", align: "center" },
      cell: (cell) => gradeLevelLabel(cell.row.original.grade_level, t),
    },
    {
      id: "year",
      accessorFn: (row) => yearName(row.year),
      header: t("academicYears.year"),
      size: 190,
      minSize: 150,
      meta: { cellClass: "max-w-0 truncate text-text-subtle" },
    },
    {
      id: "teacher",
      accessorFn: (row) => (row.teacher ? personLabel(row.teacher) : t("classGroups.noTeacher")),
      header: t("classGroups.homeroomTeacher"),
      size: 180,
      minSize: 140,
      meta: { cellClass: "max-w-0 truncate" },
      cell: (cell) => cell.row.original.teacher ? personLabel(cell.row.original.teacher) : <span class="text-text-subtle">{t("classGroups.noTeacher")}</span>,
    },
    {
      id: "students",
      accessorFn: (row) => memberCounts()?.get(row.id) ?? -1,
      header: t("nav.studentsRoster"),
      size: 130,
      minSize: 100,
      // Why counts stop past the cap — behind the header's "i" rather than a
      // notice kept above the table.
      meta: {
        cellClass: "whitespace-nowrap text-center",
        align: "center",
        headerInfo: memberCountsCapped() ? t("classGroups.memberCountCapped", { cap: MEMBER_COUNT_FETCH_CAP }) : undefined,
      },
      cell: (cell) => {
        const count = memberCounts()?.get(cell.row.original.id);
        return count == null ? <span class="text-text-subtle">—</span> : t("classGroups.studentsCount", { count: String(count) });
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => openClass(cell.row.original) },
            ...(canManage()
              ? [
                  { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => setEditTarget(cell.row.original) },
                  {
                    label: t("classBlueprints.apply"),
                    icon: <IconListChecks class="h-4 w-4" />,
                    disabled: pending(),
                    onSelect: () => void applyBlueprint(cell.row.original),
                  },
                  { label: t("classGroups.deleteClass"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
                ]
              : []),
          ]}
        />
      ),
    },
  ]);


  const createClass = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    // Checked here rather than by the browser, so the message sits under the
    // field in the app's own words — and a name of only spaces is caught too.
    if (!name().trim()) {
      setNameError(t("form.fieldRequired"));
      document.getElementById("class-name")?.focus();
      return;
    }
    const level = gradeLevel();
    if (level === null) {
      setGradeError(t("form.fieldRequired"));
      return;
    }
    setPending(true);
    try {
      const created = await postClass({
        name: name().trim(),
        grade_level: level,
        year: yearId() || undefined,
        teacher_id: teacherId() || undefined,
      });
      setName(""); setGradeLevel(null); setYearId(""); setTeacherId(""); setShowForm(false);
      // Reloading the list is housekeeping for a page we are leaving anyway: a
      // failure here used to be reported as if the class had not been created,
      // and it swallowed the navigation to the class that plainly existed.
      try {
        await Promise.all([refetch(), refetchGrades()]);
      } catch {
        // The list reloads on the next visit; the class was created.
      }
      setFlash(t("common.created"));
      if (created.skipped.length > 0) {
        // The class exists either way; its grade's template just could not
        // take every course. The report names each skipped course, so the one
        // catalog read happens before the panel can open; a failed read leaves
        // the ids in place rather than holding the report back.
        try {
          const courses = (await getCourses({ limit: 200 })).items;
          setSkippedCourseTitles(Object.fromEntries(courses.map((course) => [course.id, course.title])));
        } catch {
          // The report still opens; the rows fall back to course ids.
        }
        setCreatedClass(created.class);
        setSkipped(created.skipped);
        setReportOpen(true);
        return;
      }
      void navigate({ to: "/management/classes/$id", params: { id: created.class.id } });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  // Closing the report is what opens the class, however it closes (button,
  // Escape, backdrop): the create already happened, so there is nowhere else
  // to go back to.
  const closeSkippedReport = (open: boolean) => {
    setReportOpen(open);
    if (open) return;
    const created = createdClass();
    setCreatedClass(null);
    setSkipped([]);
    setSkippedCourseTitles({});
    if (created) void navigate({ to: "/management/classes/$id", params: { id: created.id } });
  };

  return (
    <div class="space-y-5">
      <SidePanel open={canManage() && showForm()} onOpenChange={setShowForm} guardUnsaved title={t("classGroups.newClass")} description={t("classGroups.subtitle")}>
        <form class="space-y-4" noValidate onSubmit={createClass}>
          <div class="space-y-3">
            <div class="space-y-1.5"><Label for="class-name">{t("classGroups.className")}<span class="ml-0.5 text-destructive-text">*</span></Label><Input id="class-name" required aria-required="true" maxlength={limits.latest?.course.max_class_name_len} value={name()} error={nameError()} onInput={(e) => { setName(e.currentTarget.value); setNameError(""); }} /></div>
            <div class="space-y-1.5">
              <Label for="class-grade">{t("classGroups.grade")}<span class="ml-0.5 text-destructive-text">*</span></Label>
              <GradeLevelSelect id="class-grade" value={gradeLevel()} error={!!gradeError()} min={limits.latest?.course.min_grade_level} max={limits.latest?.course.max_grade_level} onChange={(level) => { setGradeLevel(level); setGradeError(""); }} />
              <Show when={gradeError()}><p class="text-xs font-medium text-destructive-text">{gradeError()}</p></Show>
            </div>
            <div class="space-y-1.5"><Label for="class-year">{t("academicYears.year")}</Label><Select id="class-year" value={yearId()} onChange={(e) => setYearId(e.currentTarget.value)}><option value="">{t("academicYears.unassigned")}</option><For each={years.latest ?? []}>{(year) => <option value={year.id}>{year.name}</option>}</For></Select></div>
            <UserSearchSelect id="class-teacher" label={t("classGroups.homeroomTeacher")} value={teacherId()} onChange={setTeacherId} placeholder={t("classGroups.selectTeacher")} role="teacher" />
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <ClassEditPanel
        cls={editTarget()}
        open={editTarget() !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        years={years.latest ?? []}
        maxNameLen={limits.latest?.course.max_class_name_len}
        minGradeLevel={limits.latest?.course.min_grade_level}
        maxGradeLevel={limits.latest?.course.max_grade_level}
        onSaved={async () => { setFlash(t("common.saved")); await refreshList(); }}
      />

      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t("classGroups.deleteClass")}
        variant="destructive"
        description={t("classGroups.deleteConfirm")}
        summary={deleteTarget()?.name ?? ""}
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          setRowError("");
          try {
            await deleteClassById(target.id);
            setDeleteTarget(null);
            setFlash(t("common.deleted"));
            await refreshList();
          } catch (err) {
            setDeleteTarget(null);
            setRowError(formatApiError(err));
          }
        }}
      />

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <Show when={rowError()}><Alert variant="destructive">{rowError()}</Alert></Show>

      <Show when={skipped().length > 0}>
        <Alert class="flex flex-wrap items-center justify-between gap-3 border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <span class="min-w-0 flex-1">{t("classBlueprints.skippedSummary", { count: skipped().length })}</span>
          <Button type="button" size="sm" variant="outline" class="shrink-0 rounded-lg" onClick={() => setReportOpen(true)}>
            {t("classBlueprints.skippedDetails")}
          </Button>
        </Alert>
      </Show>

      <BlueprintSkippedReport
        open={reportOpen()}
        onOpenChange={closeSkippedReport}
        skipped={skipped()}
        courseTitle={courseTitle}
      />

      <Tabs value={tab()} onChange={setTab}>
        {/* Every blueprint endpoint is manager+, so a teacher must not be shown
            a tab that would 403 the moment it opens. */}
        <Show when={canManage()}>
          <TabsList class="mb-4">
            <TabsTrigger value="classes">{t("classBlueprints.classesTab")}</TabsTrigger>
            <TabsTrigger value="blueprints">{t("classBlueprints.tab")}</TabsTrigger>
          </TabsList>
        </Show>

        <TabsContent value="classes">
          <div class="space-y-4">
            <Suspense fallback={<DataTableSkeleton columns={6} rows={8} />}>
              <DataTable
                urlState
                columns={columns()}
                data={rows()}
                tableClass="table-fixed min-w-[48rem]"
                searchPredicate={(cls, needle) => matchesSearch(needle, cls.name, gradeLevelLabel(cls.grade_level, t), cls.teacher ? personLabel(cls.teacher) : null)}
                filterPlaceholder={t("classGroups.searchPlaceholder")}
                filterHint={t("search.hint.classes")}
                enablePagination
                pageSize={20}
                storageKey="classes"
                pageResetKey={gradeFilter()}
                filtersActive={gradeFilter() !== "all"}
                onClearFilters={() => setGradeFilter("all")}
                empty={t("classGroups.empty")}
                onRowClick={openClass}
                filters={
                  <Show when={grades().length > 0}>
                    <DropdownSelect
                      labelPrefix={t("classGroups.grade")}
                      options={[{ value: "all", label: t("common.all") }, ...grades().map((g) => ({ value: String(g), label: gradeLevelLabel(g, t) }))]}
                      value={gradeFilter()}
                      onChange={setGradeFilter}
                    />
                  </Show>
                }
                actions={
                  <Show when={canManage()}>
                    <Button type="button" size="sm" class="rounded-lg" onClick={() => setShowForm(true)}>
                      <IconPlus class="h-4 w-4" />
                      {t("classGroups.newClass")}
                    </Button>
                  </Show>
                }
              />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="blueprints">
          <BlueprintsTab canManage={canManage} active={() => tab() === "blueprints"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
