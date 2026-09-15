import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate } from "@tanstack/solid-router";
import { getClasses, getClassMembers, postClass } from "@/api/classes";
import { getTerms } from "@/api/terms";
import { getLimits } from "@/api/limits";
import { formatApiError, type ClassGroup } from "@/api/client";
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
  const [termId, setTermId] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  const [list, { refetch }] = createResource(async () => (await getClasses()).items);
  const listData = () => list.latest ?? list() ?? [];
  const termName = (id: string | null) => terms.latest?.find((term) => term.id === id)?.name ?? (id || t("terms.unassigned"));

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
    const needle = query().trim().toLocaleLowerCase("tr");
    if (!needle) return gradeFiltered();
    return gradeFiltered().filter((cls) =>
      [cls.name, cls.grade ?? "", cls.teacher ? personLabel(cls.teacher) : ""].join(" ").toLocaleLowerCase("tr").includes(needle),
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
    setPending(true);
    try {
      const created = await postClass({
        name: name().trim(),
        grade: grade().trim() || undefined,
        term_id: termId() || undefined,
        teacher_id: teacherId() || undefined,
      });
      setName(""); setGrade(""); setTermId(""); setTeacherId(""); setShowForm(false);
      // Reloading the list is housekeeping for a page we are leaving anyway: a
      // failure here used to be reported as if the class had not been created,
      // and it swallowed the navigation to the class that plainly existed.
      try {
        await refetch();
      } catch {
        // The list reloads on the next visit; the class was created.
      }
      setFlash(t("common.created"));
      void navigate({ to: "/management/classes/$id", params: { id: created.id } });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-5">
      <SidePanel open={canManage() && showForm()} onOpenChange={setShowForm} title={t("classGroups.newClass")} description={t("classGroups.subtitle")}>
        <form class="space-y-4" onSubmit={createClass}>
          <div class="space-y-3">
            <div class="space-y-1.5"><Label for="class-name">{t("classGroups.className")}<span class="ml-0.5 text-destructive">*</span></Label><Input id="class-name" required maxlength={limits.latest?.course.max_class_name_len} value={name()} onInput={(e) => setName(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="class-grade">{t("classGroups.grade")}</Label><Input id="class-grade" maxlength={limits.latest?.course.max_class_grade_len} value={grade()} onInput={(e) => setGrade(e.currentTarget.value)} /></div>
            <div class="space-y-1.5"><Label for="class-term">{t("terms.term")}</Label><Select id="class-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}><option value="">{t("terms.unassigned")}</option><For each={terms.latest ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For></Select></div>
            <UserSearchSelect id="class-teacher" label={t("classGroups.homeroomTeacher")} value={teacherId()} onChange={setTeacherId} placeholder={t("classGroups.selectTeacher")} role="teacher" />
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4"><Button type="submit" disabled={pending()}>{t("common.create")}</Button><Button type="button" variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button></div>
        </form>
      </SidePanel>

      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>

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
              <DataTableSearch value={query()} onChange={setQuery} placeholder={t("classGroups.searchPlaceholder")} />
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
                        termName={termName(cls.term)}
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

function ClassCard(props: { cls: ClassGroup; termName: string; memberCount: number | null; onClick: () => void }) {
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
        <Badge variant="outline" class="min-w-0 max-w-[60%] rounded-full"><span class="truncate">{props.termName}</span></Badge>
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
