import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteCourseById } from "@/api/courses";
import { deleteCourseMemberByUserId } from "@/api/courses";
import { getCourseById } from "@/api/courses";
import { getCourseMembers } from "@/api/courses";
import { postCourseMember } from "@/api/courses";
import { getClasses, getClassInstances, getMyClasses } from "@/api/classes";
import { getMyInstances } from "@/api/instances";
import { getMyCourses } from "@/api/reports";
import { formatApiError } from "@/api/client";
import type { ClassCourse, ClassGroup, CourseKind, CourseMembership, Instance } from "@/api/client";
import { CourseEditPanel } from "@/components/courses/course-edit-panel";
import { CourseNotesPanel } from "@/components/courses/course-notes-panel";
import { CourseSubjectsPanel } from "@/components/courses/course-subjects-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBook, IconEdit, IconNote, IconPlus, IconSchool, IconTrash, IconUsers } from "@/components/ui/icons";
import { createFlash } from "@/lib/flash";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useAuth } from "@/stores/auth-context";
import { useModules } from "@/stores/modules-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";
import { createUrlString } from "@/lib/url-state";
import { cn } from "@/lib/cn";
import { matchesSearch } from "@/lib/search-text";

/** One row of the "taught in" list: an instance plus the şube's name. */
type SectionRow = { instance: Instance | ClassCourse; className: string };

// Literal class names so Tailwind sees every column count the tab strip can take.
const TAB_GRID_COLS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

export default function CourseDetailPage() {
  return (
    <RouteGuard>
      <CourseDetailContent />
    </RouteGuard>
  );
}

function CourseDetailContent() {
  const location = useLocation();
  const params = useParams({ from: "/courses/$id" });
  const auth = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const id = createMemo(() => {
    location();
    return params().id;
  });

  // Subjects, sections and course notes are separately sold modules; a tab for
  // one the school switched off would only ever answer 403, so it is left out
  // and the page opens on the first tab still there.
  const modules = useModules();
  const tabOn = {
    subjects: () => modules.isEnabled("subjects"),
    sections: () => modules.isEnabled("classes"),
    notes: () => modules.isEnabled("course_notes"),
  };
  // `?tab=` is the open tab, so Back from a şube lands on "Şubeler" again.
  const [requestedTab, setCourseTab] = createUrlString("tab", "subjects");
  const availableTabs = () => [
    ...(tabOn.subjects() ? ["subjects"] : []),
    ...(tabOn.sections() ? ["sections"] : []),
    ...(tabOn.notes() ? ["notes"] : []),
    ...(hasMembers() ? ["members"] : []),
  ];
  // A tab not on offer falls back to the first one that is, without
  // rewriting the URL: "members" only appears once the course has loaded.
  const courseTab = () => {
    const tabs = availableTabs();
    return tabs.length === 0 || tabs.includes(requestedTab()) ? requestedTab() : tabs[0];
  };
  const [course, { refetch: refetchCourse }] = createResource(id, (courseId) => getCourseById(courseId));
  const [mine] = createResource(
    () => (auth.user()?.role === "student" ? true : null),
    async (enabled) => (enabled ? (await getMyCourses()).items : []),
  );

  // Catalog rights: the creator or a manager+. Teaching rights now live on the
  // instance, so this page only governs the catalog row itself.
  const canManageCatalog = () => {
    const c = course();
    const u = auth.user();
    if (!c || !u) return false;
    return c.creator.id === u.id || hasMinRole(u.role, "manager");
  };
  const isOffice = () => hasMinRole(auth.user()?.role ?? "student", "manager");
  // A club/etüt keeps its own school-wide member list; a regular ders does not
  // — its students come from the şube that attached it.
  const hasMembers = () => course()?.kind === "club" || course()?.kind === "study";

  // The şubeler teaching this course. A student or teacher reads their own set
  // in one call; the office has no course-scoped instance route, so it walks
  // the class list instead (one call per class, capped by the page limit).
  const [sections] = createResource(
    () => (course() && tabOn.sections() ? { courseId: id(), office: isOffice() } : null),
    async (args): Promise<SectionRow[]> => {
      if (!args) return [];
      if (!args.office) {
        // `/instances/me` is the one instance list a student or teacher can
        // read; `/classes/me` names the şubeler behind it (one call each).
        const [instances, classes] = await Promise.all([
          getMyInstances({ limit: 200 }),
          getMyClasses({ limit: 200 }).catch(() => ({ items: [] as ClassGroup[] })),
        ]);
        const names = new Map(classes.items.map((klass) => [klass.id, klass.name]));
        return instances.items
          .filter((instance) => instance.course === args.courseId)
          .map((instance) => ({ instance, className: names.get(instance.class) ?? "—" }));
      }
      const classes = (await getClasses({ limit: 200 })).items;
      const perClass = await Promise.all(
        classes.map(async (klass) => {
          const instances = (await getClassInstances(klass.id, { limit: 200 })).items;
          return instances
            .filter((instance) => instance.course === args.courseId)
            .map((instance) => ({ instance, className: klass.name }));
        }),
      );
      return perClass.flat();
    },
  );

  const [members, { refetch: refetchMembers }] = createResource(
    () => (hasMembers() && canManageCatalog() ? id() : null),
    async (courseId) => (courseId ? (await getCourseMembers(courseId)).items : []),
  );

  const [editing, setEditing] = createSignal(false);
  const [showSubjectForm, setShowSubjectForm] = createSignal(false);
  const [showNoteForm, setShowNoteForm] = createSignal(false);
  const [showMemberForm, setShowMemberForm] = createSignal(false);
  const [noteCount, setNoteCount] = createSignal<number | null>(null);
  const [sectionSearch, setSectionSearch] = createUrlString("sections.q");
  const [memberUserId, setMemberUserId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [removeTarget, setRemoveTarget] = createSignal<{ userId: string; userName: string } | null>(null);

  const canViewCourse = () => {
    const u = auth.user();
    if (!u) return false;
    if (u.role !== "student") return true;
    return (mine() ?? []).some((myCourse) => myCourse.id === id());
  };
  const accessReady = () => auth.user()?.role !== "student" || mine() !== undefined;

  const courseKindLabel = (value: CourseKind | undefined) =>
    value === "study" ? t("courses.kind.study") : value === "club" ? t("courses.kind.club") : t("courses.kind.course");
  const courseListSearch = (value: CourseKind | undefined) => (value ? ({ kind: value } as never) : ({} as never));
  const sectionCount = createMemo(() => sections()?.length ?? 0);
  const visibleSections = createMemo(() => {
    const query = sectionSearch().trim();
    return query ? (sections() ?? []).filter((section) => matchesSearch(query, section.className)) : sections() ?? [];
  });
  const memberUserIds = () => (members() ?? []).map((row) => row.user.id);

  const sectionColumns = createMemo<ColumnDef<SectionRow>[]>(() => [
    {
      id: "class",
      accessorFn: (row) => row.className,
      header: t("classGroups.className"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => (
        <Link to="/instances/$id" params={{ id: cell.row.original.instance.id }} class="hover:text-primary-text hover:underline">
          {cell.row.original.className}
        </Link>
      ),
    },
    {
      id: "dersSaati",
      accessorFn: (row) => row.instance.ders_saati,
      header: t("instances.dersSaati"),
      meta: { cellClass: "" },
    },
    {
      id: "roster",
      accessorFn: (row) => row.instance.enrollment_count,
      header: t("courses.roster"),
      meta: { cellClass: "" },
    },
    {
      id: "karne",
      accessorFn: (row) => (row.instance.counts_toward_karne ? t("common.yes") : t("common.no")),
      header: t("instances.countsTowardKarne"),
      cell: (cell) => (
        <Badge variant={cell.row.original.instance.counts_toward_karne ? "secondary" : "outline"} class="rounded-full">
          {cell.row.original.instance.counts_toward_karne ? t("common.yes") : t("common.no")}
        </Badge>
      ),
    },
  ]);

  const memberColumns = createMemo<ColumnDef<CourseMembership>[]>(() => [
    {
      id: "username",
      accessorFn: (row) => row.user.display_name || row.user.username,
      header: t("admin.username"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => cell.row.original.user.display_name || cell.row.original.user.username,
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <Show when={canManageCatalog()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              {
                label: t("courses.removeMember"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () =>
                  setRemoveTarget({
                    userId: cell.row.original.user.id,
                    userName: cell.row.original.user.display_name || cell.row.original.user.username,
                  }),
              },
            ]}
          />
        </Show>
      ),
    },
  ]);

  const [flash, setFlash] = createFlash();

  const wrap = async (fn: () => Promise<void>, ok?: string) => {
    setError("");
    setPending(true);
    try {
      await fn();
      if (ok) setFlash(ok);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const startEdit = () => {
    if (course()) setEditing(true);
  };

  return (
    <Suspense fallback={<PageSpinner />}>
      <Show
        when={course()?.id === id() ? course() : undefined}
        fallback={
          <Show when={course.error} fallback={<PageSpinner />}>
            <Alert variant="destructive">{formatApiError(course.error)}</Alert>
          </Show>
        }
      >
        {(c) => (
          <Show when={accessReady()} fallback={<PageSpinner />}>
            <Show when={canViewCourse()} fallback={<Alert variant="destructive">{t("common.accessDenied")}</Alert>}>
              <div class="mx-auto w-full max-w-[1440px] space-y-4">
                <section class="rounded-xl border border-border-line bg-surface-base px-4 py-3 shadow-xs sm:px-5">
                  <Breadcrumbs
                    items={[
                      { label: courseKindLabel(c().kind), to: "/courses", search: courseListSearch(c().kind) },
                      { label: c().title },
                    ]}
                  />
                  <PageHeader
                    title={c().title}
                    description={c().description || undefined}
                    class="border-border-line"
                    actions={
                      <Show when={canManageCatalog()}>
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[
                            { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: startEdit },
                            {
                              label: t("courses.delete"),
                              icon: <IconTrash class="h-4 w-4" />,
                              destructive: true,
                              onSelect: () => setDeleteOpen(true),
                            },
                          ]}
                        />
                      </Show>
                    }
                  />
                </section>

                <ConfirmDialog
                  open={deleteOpen()}
                  onOpenChange={setDeleteOpen}
                  title={t("confirm.deleteTitle")}
                  variant="destructive"
                  summary={t("courses.delete") + `: “${c().title}”`}
                  onConfirm={async () => {
                    await wrap(async () => {
                      await deleteCourseById(id());
                      void navigate({ to: "/courses", search: courseListSearch(c().kind) });
                    });
                  }}
                />

                <ConfirmDialog
                  open={removeTarget() !== null}
                  onOpenChange={() => setRemoveTarget(null)}
                  title={t("courses.removeMember")}
                  variant="destructive"
                  summary={`${t("courses.removeMemberConfirm")} "${removeTarget()?.userName}"`}
                  onConfirm={async () => {
                    const target = removeTarget();
                    if (!target) return;
                    try {
                      await deleteCourseMemberByUserId(id(), target.userId);
                      await refetchMembers();
                      await refetchCourse();
                      setFlash(t("common.deleted"));
                    } catch (err) {
                      setError(formatApiError(err));
                    } finally {
                      setRemoveTarget(null);
                    }
                  }}
                />

                <CourseEditPanel
                  course={c()}
                  open={editing()}
                  onOpenChange={setEditing}
                  onSaved={async () => {
                    setFlash(t("common.saved"));
                    try { await refetchCourse(); } catch { /* the next load picks the change up */ }
                  }}
                />

                <SidePanel open={showMemberForm()} onOpenChange={setShowMemberForm} title={t("courses.addMember")} description={c().title}>
                  <form
                    class="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void wrap(async () => {
                        const uid = memberUserId().trim();
                        if (!uid) throw new Error(t("events.userId"));
                        await postCourseMember(id(), uid);
                        setMemberUserId("");
                        setShowMemberForm(false);
                        await refetchMembers();
                        await refetchCourse();
                      }, t("common.saved"));
                    }}
                  >
                    <UserSearchSelect
                      id="course-member-user"
                      value={memberUserId()}
                      excludeIds={memberUserIds()}
                      placeholder={t("form.selectStudent")}
                      onChange={setMemberUserId}
                      role="student"
                    />
                    <div class="flex flex-wrap gap-2">
                      <Button type="submit" class="rounded-xl" disabled={pending()}>
                        {t("courses.addMember")}
                      </Button>
                      <Button type="button" variant="outline" class="rounded-xl" onClick={() => setShowMemberForm(false)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </form>
                </SidePanel>

                <Show when={flash()}>
                  <Alert variant="success">{flash()}</Alert>
                </Show>
                <Show when={error()}>
                  <p class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive-text">{error()}</p>
                </Show>

                <Tabs value={courseTab()} onChange={setCourseTab} class="space-y-4">
                  <TabsList class={cn("w-full justify-start gap-0 overflow-x-auto rounded-lg border-border-line bg-surface-base p-0 shadow-none sm:grid", TAB_GRID_COLS[availableTabs().length] ?? "sm:grid-cols-4")} aria-label={c().title}>
                    <Show when={tabOn.subjects()}>
                      <TabsTrigger value="subjects" onClick={(event) => { event.preventDefault(); setCourseTab("subjects"); }} class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconBook class="h-4 w-4" />{t("subjects.title")}</TabsTrigger>
                    </Show>
                    <Show when={tabOn.sections()}>
                      <TabsTrigger value="sections" onClick={(event) => { event.preventDefault(); setCourseTab("sections"); }} class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconSchool class="h-4 w-4" />{t("instances.title")}</TabsTrigger>
                    </Show>
                    <Show when={tabOn.notes()}>
                      <TabsTrigger value="notes" onClick={(event) => { event.preventDefault(); setCourseTab("notes"); }} class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconNote class="h-4 w-4" />{t("courseNotes.title")}<Show when={noteCount() != null}><span class="ml-0.5 tabular-nums">{noteCount()}</span></Show></TabsTrigger>
                    </Show>
                    <Show when={hasMembers()}>
                      <TabsTrigger value="members" onClick={(event) => { event.preventDefault(); setCourseTab("members"); }} class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconUsers class="h-4 w-4" />{t("courses.members")}</TabsTrigger>
                    </Show>
                  </TabsList>

                  <Show when={tabOn.subjects()}>
                  <TabsContent value="subjects" forceMount class="space-y-3">
                    <CourseSubjectsPanel
                      courseId={id()}
                      canManage={canManageCatalog()}
                      createOpen={showSubjectForm()}
                      onCreateOpenChange={setShowSubjectForm}
                    />
                  </TabsContent>
                  </Show>

                  <Show when={tabOn.sections()}>
                  <TabsContent value="sections" forceMount class="space-y-3">
                    {/* The table draws its toolbar (search + columns) and grid
                        as two sibling cards, like the list pages. */}
                    <Suspense fallback={<DataTableSkeleton />}>
                      <Show
                        when={sectionCount() > 0}
                        fallback={<EmptyState kind="people" title={t("instances.empty")} description={t("instances.emptyHelp")} />}
                      >
                        <DataTable
                          columns={sectionColumns()}
                          data={visibleSections()}
                          searchValue={sectionSearch()}
                          onSearchInput={setSectionSearch}
                          filterPlaceholder={t("common.searchPlaceholder")}
                          enablePagination
                          pageSize={10}
                          empty={t("common.noMatches")}
                          onRowClick={(row) => void navigate({ to: "/instances/$id", params: { id: row.instance.id } })}
                        />
                      </Show>
                    </Suspense>
                  </TabsContent>
                  </Show>

                  <Show when={tabOn.notes()}>
                    <TabsContent value="notes" forceMount class="space-y-3" />
                  </Show>

                  <Show when={hasMembers()}>
                  <TabsContent value="members" forceMount class="space-y-3">
                      <Show when={canManageCatalog()} fallback={<EmptyState kind="people" title={t("common.accessDenied")} />}>
                        <Suspense fallback={<DataTableSkeleton />}>
                          <DataTable
                            columns={memberColumns()}
                            data={members() ?? []}
                            filterColumn="username"
                            enablePagination
                            pageSize={10}
                            empty={t("exams.emptyRoster")}
                            emptyIllustration="people"
                            actions={
                              <Button type="button" size="sm" class="rounded-lg" onClick={() => setShowMemberForm(true)}>
                                <IconPlus class="h-4 w-4" />{t("courses.addMember")}
                              </Button>
                            }
                          />
                        </Suspense>
                      </Show>
                    </TabsContent>
                  </Show>
                </Tabs>
                <Show when={tabOn.notes()}>
                  <div class={courseTab() === "notes" ? "" : "hidden"}>
                    <CourseNotesPanel
                      courseId={id()}
                      canManage={canManageCatalog()}
                      createOpen={showNoteForm()}
                      onCreateOpenChange={setShowNoteForm}
                      onCountChange={setNoteCount}
                    />
                  </div>
                </Show>
              </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
