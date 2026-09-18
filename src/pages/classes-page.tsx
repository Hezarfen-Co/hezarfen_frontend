import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate } from "@tanstack/solid-router";
import { getClasses, getClassMembers, postClass } from "@/api/classes";
import { getAcademicYears } from "@/api/academic-years";
import { getCourses } from "@/api/courses";
import { getLimits } from "@/api/limits";
import { formatApiError, type BlueprintSkip, type ClassGroup } from "@/api/client";
import { BlueprintSkippedReport } from "@/components/classes/blueprint-skipped-report";
import { RouteGuard } from "@/components/layout/route-guard";
import { DataTableSearch } from "@/components/ui/data-table-search";
import { DataSection } from "@/components/ui/data-section";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChevronRight, IconPlus } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlueprintsTab } from "@/components/classes/blueprints-tab";
import { ComingSoonBadge, ComingSoonValue } from "@/components/ui/coming-soon";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

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
  const [gradeFilter, setGradeFilter] = createSignal("all");
  const [query, setQuery] = createSignal("");
  const [showForm, setShowForm] = createSignal(false);
  const [name, setName] = createSignal("");
  const [grade, setGrade] = createSignal("");
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
  const [list, { refetch }] = createResource(async () => (await getClasses()).items);
  const courseTitle = (id: string) => skippedCourseTitles()[id] ?? id;
  const listData = () => list.latest ?? list() ?? [];
  const yearName = (id: string | null) => years.latest?.find((year) => year.id === id)?.name ?? (id || t("academicYears.unassigned"));

  // Grade tabs mirror Figma's Tümü/Lise/Ortaokul row structurally, but the
  // labels are read from whatever `grade` values this school actually uses
  // (freeform text on ClassGroup) instead of assuming a Turkish lise/ortaokul
  // split that may not hold for every institution.
  const grades = createMemo(() => {
    const seen = new Set<string>();
    for (const cls of listData()) if (cls.grade) seen.add(cls.grade);
    return [...seen].sort((a, b) => a.localeCompare(b, "tr"));
  });

  const gradeFiltered = createMemo(() => {
    const g = gradeFilter();
    return g === "all" ? listData() : listData().filter((cls) => cls.grade === g);
  });

  const searched = createMemo(() => {
    const needle = query().trim();
    if (!needle) return gradeFiltered();
    return gradeFiltered().filter((cls) =>
      matchesSearch(needle, cls.name, cls.grade, cls.teacher ? personLabel(cls.teacher) : null),
    );
  });

  const memberCountIds = createMemo(() => {
    const ids = listData().map((cls) => cls.id);
    return ids.length > 0 && ids.length <= MEMBER_COUNT_FETCH_CAP ? ids : null;
  });
  const [memberCounts] = createResource(memberCountIds, async (ids) => {
    const entries = await Promise.all(
      ids.map(async (id) => {
        try {
          return [id, (await getClassMembers(id, { limit: 1 })).total] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    );
    return new Map(entries);
  });

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
    setPending(true);
    try {
      const created = await postClass({
        name: name().trim(),
        grade: grade().trim() || undefined,
        year: yearId() || undefined,
        teacher_id: teacherId() || undefined,
      });
      setName(""); setGrade(""); setYearId(""); setTeacherId(""); setShowForm(false);
      // Reloading the list is housekeeping for a page we are leaving anyway: a
      // failure here used to be reported as if the class had not been created,
      // and it swallowed the navigation to the class that plainly existed.
      try {
        await refetch();
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
            <div class="space-y-1.5"><Label for="class-name">{t("classGroups.className")}<span class="ml-0.5 text-destructive">*</span></Label><Input id="class-name" required aria-required="true" maxlength={limits.latest?.course.max_class_name_len} value={name()} error={nameError()} onInput={(e) => { setName(e.currentTarget.value); setNameError(""); }} /></div>
            <div class="space-y-1.5"><Label for="class-grade">{t("classGroups.grade")}</Label><Input id="class-grade" maxlength={limits.latest?.course.max_class_grade_len} value={grade()} onInput={(e) => setGrade(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="class-year">{t("academicYears.year")}</Label><Select id="class-year" value={yearId()} onChange={(e) => setYearId(e.currentTarget.value)}><option value="">{t("academicYears.unassigned")}</option><For each={years.latest ?? []}>{(year) => <option value={year.id}>{year.name}</option>}</For></Select></div>
            <UserSearchSelect id="class-teacher" label={t("classGroups.homeroomTeacher")} value={teacherId()} onChange={setTeacherId} placeholder={t("classGroups.selectTeacher")} role="teacher" />
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>

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
          <DataSection
            title={t("classGroups.title")}
            description={t("classGroups.subtitle")}
            actions={
              <Show when={canManage()}>
                <Button size="sm" variant="outline" class="rounded-lg" disabled title={t("comingSoon.title")}>
                  {t("classGroups.mergeClasses")}
                  <ComingSoonBadge class="ml-1.5" />
                </Button>
                <Button size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => setShowForm(true)}>
                  <IconPlus class="h-4 w-4" />
                  {t("classGroups.newClass")}
                </Button>
              </Show>
            }
          >
            <div class="flex flex-wrap items-center gap-2">
              <DataTableSearch value={query()} onChange={setQuery} placeholder={t("classGroups.searchPlaceholder")} hint={t("search.hint.classes")} />
              <Show when={grades().length > 0}>
                <Tabs value={gradeFilter()} onChange={setGradeFilter}>
                  <TabsList>
                    <TabsTrigger value="all">{t("classGroups.allGrades")}</TabsTrigger>
                    <For each={grades()}>{(g) => <TabsTrigger value={g}>{g}</TabsTrigger>}</For>
                  </TabsList>
                </Tabs>
              </Show>
            </div>

            <Suspense fallback={<DataTableSkeleton />}>
              <Show when={searched().length > 0} fallback={<EmptyState kind="people" title={t("classGroups.empty")} />}>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <For each={searched()}>
                    {(cls) => (
                      <ClassCard
                        cls={cls}
                        yearName={yearName(cls.year)}
                        memberCount={memberCounts()?.get(cls.id) ?? null}
                        onClick={() => void navigate({ to: "/management/classes/$id", params: { id: cls.id } })}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Suspense>
          </DataSection>
        </TabsContent>

        <TabsContent value="blueprints">
          <BlueprintsTab canManage={canManage} active={() => tab() === "blueprints"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ClassCard(props: { cls: ClassGroup; yearName: string; memberCount: number | null; onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={props.onClick}
      class="flex flex-col gap-3 rounded-lg border border-border-line bg-surface-base p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-10 shrink-0 items-center justify-center rounded-md bg-info/10 text-[13px] font-semibold text-info">
          {props.cls.grade || "—"}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-semibold text-text-strong">{props.cls.name}</p>
          <p class="truncate text-xs text-text-subtle">
            {t("classGroups.homeroomTeacher")}: {props.cls.teacher ? personLabel(props.cls.teacher) : t("classGroups.noTeacher")}
          </p>
        </div>
        <ComingSoonBadge class="shrink-0" />
        <IconChevronRight class="h-4 w-4 shrink-0 text-text-subtle" />
      </div>
      <div class="grid grid-cols-2 gap-2 border-t border-border-hairline pt-3 text-xs">
        <div>
          <p class="text-text-subtle">{t("classGroups.attendanceRate")}</p>
          <ComingSoonValue class="mt-0.5" />
        </div>
        <div>
          <p class="text-text-subtle">{t("classGroups.competency")}</p>
          <ComingSoonValue class="mt-0.5" />
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-border-hairline pt-3 text-sm">
        <Badge variant="outline" class="min-w-0 max-w-[60%] rounded-full"><span class="truncate">{props.yearName}</span></Badge>
        <Show when={props.memberCount != null} fallback={<span class="shrink-0 text-xs text-text-subtle">—</span>}>
          <span class="shrink-0 font-medium text-text-default">{t("classGroups.studentsCount", { count: String(props.memberCount) })}</span>
        </Show>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-border-hairline pt-3 text-xs text-text-subtle">
        <span>{t("classGroups.weakestTopic")}</span>
        <ComingSoonValue />
      </div>
    </button>
  );
}
