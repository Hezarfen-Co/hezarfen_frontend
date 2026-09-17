import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
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
import { patchCourseById } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { ClassCourse, ClassGroup, CourseKind, CourseMembership, Instance } from "@/api/client";
import { CourseNotesPanel } from "@/components/courses/course-notes-panel";
import { CourseSubjectsPanel } from "@/components/courses/course-subjects-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBook, IconEdit, IconNote, IconPlus, IconSchool, IconTrash, IconUsers } from "@/components/ui/icons";
import { createFlash } from "@/lib/flash";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Textarea } from "@/components/ui/textarea";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { hasMinRole } from "@/lib/roles";

const COURSE_KINDS: CourseKind[] = ["course", "study", "club"];

/** One row of the "taught in" list: an instance plus the şube's name. */
type SectionRow = { instance: Instance | ClassCourse; className: string };

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

  const [courseTab, setCourseTab] = createSignal("subjects");
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
    () => (course() ? { courseId: id(), office: isOffice() } : null),
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
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [kind, setKind] = createSignal<CourseKind>("course");
  const [showSubjectForm, setShowSubjectForm] = createSignal(false);
  const [showNoteForm, setShowNoteForm] = createSignal(false);
  const [showMemberForm, setShowMemberForm] = createSignal(false);
  const [subjectCount, setSubjectCount] = createSignal(0);
  const [noteCount, setNoteCount] = createSignal(0);
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
  const countDescription = (count: number, item: string) => t("common.countItem", { count, item });

  const sectionCount = createMemo(() => sections()?.length ?? 0);
  const memberCount = createMemo(() => members()?.length ?? 0);
  const memberUserIds = () => (members() ?? []).map((row) => row.user.id);

  const sectionColumns = createMemo<ColumnDef<SectionRow>[]>(() => [
    {
      id: "class",
      accessorFn: (row) => row.className,
      header: t("classGroups.className"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => (
        <Link to="/instances/$id" params={{ id: cell.row.original.instance.id }} class="hover:text-primary hover:underline">
          {cell.row.original.className}
        </Link>
      ),
    },
    {
      id: "dersSaati",
      accessorFn: (row) => row.instance.ders_saati,
      header: t("instances.dersSaati"),
      meta: { cellClass: "mono" },
    },
    {
      id: "roster",
      accessorFn: (row) => row.instance.enrollment_count,
      header: t("courses.roster"),
      meta: { cellClass: "mono" },
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
    const c = course();
    if (!c) return;
    setTitle(c.title);
    setDescription(c.description);
    setKind(c.kind ?? "course");
    setEditing(true);
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
                <div class="space-y-1.5">
                  <nav class="detail-breadcrumb">
                    <Link to="/courses" search={courseListSearch(c().kind)}>{courseKindLabel(c().kind)}</Link>
                    <span aria-hidden>›</span>
                    <span class="text-foreground">{c().title}</span>
                  </nav>
                  <PageHeader
                    title={c().title}
                    description={c().description || "—"}
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
                  <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                        <IconBook class="h-4 w-4" />
                      </span>
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-text-subtle">{t("courses.kind")}</p>
                        <p class="truncate text-sm font-semibold text-text-default">{courseKindLabel(c().kind)}</p>
                      </div>
                    </div>
                    <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                        <IconSchool class="h-4 w-4" />
                      </span>
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-text-subtle">{t("instances.taughtIn")}</p>
                        <p class="mono truncate text-sm font-semibold text-text-default">{c().class_course_count}</p>
                      </div>
                    </div>
                    <div class="flex min-w-0 items-center gap-3 rounded-xl border border-border-line bg-surface-base p-3">
                      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-tint text-text-subtle">
                        <IconUsers class="h-4 w-4" />
                      </span>
                      <div class="min-w-0">
                        <p class="text-xs font-medium text-text-subtle">{t("courses.members")}</p>
                        <p class="mono truncate text-sm font-semibold text-text-default">{c().course_membership_count}</p>
                      </div>
                    </div>
                  </div>
                </div>

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

                <SidePanel open={editing()} onOpenChange={setEditing} title={t("common.edit")} description={c().title}>
                  <form
                    class="space-y-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void wrap(async () => {
                        await patchCourseById(id(), {
                          title: title().trim(),
                          description: description(),
                          kind: kind(),
                        });
                        setEditing(false);
                        await refetchCourse();
                      }, t("common.saved"));
                    }}
                  >
                    <div class="space-y-3 rounded-xl border border-border-line bg-surface-tint p-4">
                      <div class="space-y-1.5">
                        <Label for="edit-course-title">{t("form.title")}</Label>
                        <Input
                          id="edit-course-title"
                          value={title()}
                          required
                          maxlength={200}
                          onInput={(e) => setTitle(e.currentTarget.value)}
                        />
                      </div>
                      <div class="space-y-1.5">
                        <Label for="edit-course-desc">{t("form.description")}</Label>
                        <Textarea
                          id="edit-course-desc"
                          value={description()}
                          rows={3}
                          maxlength={2000}
                          onInput={(e) => setDescription(e.currentTarget.value)}
                        />
                      </div>
                      <div class="space-y-1.5">
                        <Label for="edit-course-kind">{t("courses.kind")}</Label>
                        <Select id="edit-course-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as CourseKind)}>
                          <For each={COURSE_KINDS}>{(item) => <option value={item}>{courseKindLabel(item)}</option>}</For>
                        </Select>
                      </div>
                    </div>
                    <div class="sticky bottom-0 -mx-5 flex flex-wrap gap-2 border-t border-border-line bg-surface-base px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
                      <Button type="submit" class="flex-1 rounded-xl sm:flex-none" disabled={pending()}>
                        {t("common.update")}
                      </Button>
                      <Button type="button" variant="outline" class="flex-1 rounded-xl sm:flex-none" onClick={() => setEditing(false)}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </form>
                </SidePanel>

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
                  <p class="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error()}</p>
                </Show>

                <Tabs value={courseTab()} onChange={setCourseTab} class="space-y-4">
                  <TabsList class="flex w-full justify-start overflow-x-auto sm:grid sm:grid-cols-4" aria-label={c().title}>
                    <TabsTrigger value="subjects" class="min-w-0"><IconBook class="h-4 w-4" />{t("subjects.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{subjectCount()}</Badge></TabsTrigger>
                    <TabsTrigger value="sections" class="min-w-0"><IconSchool class="h-4 w-4" />{t("instances.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{sectionCount()}</Badge></TabsTrigger>
                    <TabsTrigger value="notes" class="min-w-0"><IconNote class="h-4 w-4" />{t("courseNotes.title")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{noteCount()}</Badge></TabsTrigger>
                    <Show when={hasMembers()}>
                      <TabsTrigger value="members" class="min-w-0"><IconUsers class="h-4 w-4" />{t("courses.members")}<Badge variant="secondary" class="h-5 min-w-5 justify-center rounded-full px-1.5 py-0 text-[10px] group-data-selected:bg-background group-data-selected:text-foreground">{c().course_membership_count}</Badge></TabsTrigger>
                    </Show>
                  </TabsList>

                  <TabsContent value="subjects" class="space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" class="rounded-full">{countDescription(subjectCount(), t("subjects.item"))}</Badge>
                      <Show when={canManageCatalog()}>
                        <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowSubjectForm(true)}>
                          <IconPlus class="h-4 w-4" />{t("subjects.add")}
                        </Button>
                      </Show>
                    </div>
                    <CourseSubjectsPanel
                      courseId={id()}
                      canManage={canManageCatalog()}
                      active={courseTab() === "subjects"}
                      createOpen={showSubjectForm()}
                      onCreateOpenChange={setShowSubjectForm}
                      onCountChange={setSubjectCount}
                    />
                  </TabsContent>

                  <TabsContent value="sections" class="space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" class="rounded-full">{countDescription(sectionCount(), t("instances.item"))}</Badge>
                      <span class="text-xs text-text-subtle">{t("instances.selectSectionHelp")}</span>
                    </div>
                    <Suspense fallback={<DataTableSkeleton />}>
                      <Show
                        when={sectionCount() > 0}
                        fallback={<EmptyState kind="people" title={t("instances.empty")} description={t("instances.emptyHelp")} />}
                      >
                        <DataTable
                          columns={sectionColumns()}
                          data={sections() ?? []}
                          filterColumn="class"
                          enablePagination
                          pageSize={10}
                          onRowClick={(row) => void navigate({ to: "/instances/$id", params: { id: row.instance.id } })}
                        />
                      </Show>
                    </Suspense>
                  </TabsContent>

                  <TabsContent value="notes" class="space-y-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" class="rounded-full">{countDescription(noteCount(), t("courseNotes.item"))}</Badge>
                      <Show when={canManageCatalog()}>
                        <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowNoteForm(true)}>
                          <IconPlus class="h-4 w-4" />{t("courseNotes.add")}
                        </Button>
                      </Show>
                    </div>
                    <CourseNotesPanel
                      courseId={id()}
                      canManage={canManageCatalog()}
                      active={courseTab() === "notes"}
                      createOpen={showNoteForm()}
                      onCreateOpenChange={setShowNoteForm}
                      onCountChange={setNoteCount}
                    />
                  </TabsContent>

                  <Show when={hasMembers()}>
                    <TabsContent value="members" class="space-y-3">
                      <div class="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" class="rounded-full">{countDescription(memberCount(), t("courses.memberItem"))}</Badge>
                        <Show when={canManageCatalog()}>
                          <Button type="button" variant="outline" size="sm" class="ml-auto rounded-lg" onClick={() => setShowMemberForm(true)}>
                            <IconPlus class="h-4 w-4" />{t("courses.addMember")}
                          </Button>
                        </Show>
                      </div>
                      <Show when={canManageCatalog()} fallback={<EmptyState kind="people" title={t("common.accessDenied")} />}>
                        <Suspense fallback={<DataTableSkeleton />}>
                          <Show when={memberCount() > 0} fallback={<EmptyState kind="people" title={t("exams.emptyRoster")} />}>
                            <DataTable columns={memberColumns()} data={members() ?? []} filterColumn="username" enablePagination pageSize={10} />
                          </Show>
                        </Suspense>
                      </Show>
                    </TabsContent>
                  </Show>
                </Tabs>
              </div>
            </Show>
          </Show>
        )}
      </Show>
    </Suspense>
  );
}
