import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  getClassById,
  deleteClassById,
  getClassMembers,
  postClassMember,
  deleteClassMember,
  getClassInstances,
  postClassInstance,
  deleteClassInstance,
  postClassBlueprintApply,
} from "@/api/classes";
import { getCourseById, getCourses } from "@/api/courses";
import { getAcademicYears } from "@/api/academic-years";
import { getLimits } from "@/api/limits";
import { ApiError, formatApiError, type BlueprintSkip, type ClassCourse, type ClassGroup, type ClassMember, type PersonRef } from "@/api/client";
import { BlueprintSkippedReport } from "@/components/classes/blueprint-skipped-report";
import { ClassEditPanel } from "@/components/classes/class-edit-panel";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconBook, IconEdit, IconExternalLink, IconListChecks, IconPlus, IconTrash, IconUsers } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { COMPACT_SCREEN_QUERY } from "@/lib/create-page-size";
import { createMediaQuery } from "@/lib/create-media-query";
import { createFlash } from "@/lib/flash";
import { cn } from "@/lib/cn";
import { hasMinRole } from "@/lib/roles";
import { matchesSearch } from "@/lib/search-text";
import { createUrlString } from "@/lib/url-state";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";
import { gradeLevelLabel } from "@/lib/grade-level";
import { RecordNotFound } from "@/components/layout/record-not-found";
import { isNotFoundError } from "@/lib/record-list-path";

export default function ClassDetailPage() {
  return <RouteGuard minRole="teacher"><ClassDetailContent /></RouteGuard>;
}

// A person's name for this page. personLabel falls back to the account id, and
// a raw uuid means nothing to the reader — an unnamed ref reads "—" instead.
const personName = (person: PersonRef | null | undefined) => person?.display_name || person?.username || "—";

// One info tile of the header card, the same surface homework and event
// detail pages use for their facts.
const TILE = "min-w-0 rounded-xl border border-border-hairline bg-surface-tint px-4 py-4";
const TILE_LABEL = "text-xs font-medium uppercase tracking-[0.08em] text-text-subtle";
const TILE_VALUE = "mt-1 break-words font-medium text-text-default";

// Header and section buttons share the row-actions trigger's box (h-8,
// rounded-lg) so a button and the ⋮ menu beside it line up.
const ACTION_BUTTON = "h-8 min-w-[7.5rem] rounded-lg! px-3 text-[13px]";

function ClassDetailContent() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ from: "/management/classes/$id" });
  const id = createMemo(() => { location(); return params().id; });
  const canManage = () => hasMinRole(auth.user()?.role, "manager");

  const [tab, setTab] = createUrlString("tab", "members");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  const [editing, setEditing] = createSignal(false);
  const [deleteOpen, setDeleteOpen] = createSignal(false);
  const [showAddMember, setShowAddMember] = createSignal(false);
  const [addUserId, setAddUserId] = createSignal("");
  const [removeMember, setRemoveMember] = createSignal<ClassMember | null>(null);
  const [showAttachCourse, setShowAttachCourse] = createSignal(false);
  const [attachCourseId, setAttachCourseId] = createSignal("");
  const [detachCourse, setDetachCourse] = createSignal<ClassCourse | null>(null);
  const [skipped, setSkipped] = createSignal<BlueprintSkip[]>([]);
  const [reportOpen, setReportOpen] = createSignal(false);

  const [cls, { refetch: refetchClass }] = createResource(id, (classId) => getClassById(classId));
  const [years] = createResource(async () => (await getAcademicYears({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  // Every viewer needs the catalog: the courses table names each attached ders
  // by title, and without it a teacher saw the raw course id.
  const [courses] = createResource(() => getCourses({ limit: 100 }).then((page) => page.items));
  const [membersPage, { refetch: refetchMembers }] = createResource(id, (classId) => getClassMembers(classId, { limit: 200 }));
  const [coursesPage, { refetch: refetchCourses }] = createResource(id, (classId) => getClassInstances(classId, { limit: 50 }));
  const members = () => membersPage.latest?.items;
  const classCourses = () => coursesPage.latest?.items;
  // A course attached here but past the first catalog page: read it by id.
  const missingCourseIds = createMemo(() => {
    const list = courses.latest;
    if (!list) return null;
    const missing = (classCourses() ?? []).map((row) => row.course).filter((cid) => !list.some((course) => course.id === cid));
    return missing.length > 0 ? missing.join(",") : null;
  });
  const [extraCourses] = createResource(missingCourseIds, async (ids) => {
    const found = await Promise.all(ids.split(",").map((cid) => getCourseById(cid).catch(() => null)));
    return found.filter((course) => course !== null);
  });

  // The last class the page actually loaded. A refetch that fails leaves the
  // resource in an error state, and reading it there throws; holding the last
  // good value lets the page stay up and keeps the error screen for the case
  // it is meant for — a first load that never produced a class.
  const [loadedClass, setLoadedClass] = createSignal<ClassGroup>();
  createEffect(() => {
    if (cls.state === "ready") setLoadedClass(cls());
  });

  const yearName = (yid: string | null) => yid ? years.latest?.find((year) => year.id === yid)?.name ?? "—" : t("academicYears.unassigned");
  const courseTitle = (courseId: string) =>
    courses.latest?.find((course) => course.id === courseId)?.title
    ?? extraCourses.latest?.find((course) => course.id === courseId)?.title
    ?? "—";
  const memberUserIds = () => (members() ?? []).map((row) => row.user.id);
  const attachedCourseIds = () => (classCourses() ?? []).map((row) => row.course);

  // Refreshing the tables after a successful write is not part of the write:
  // a failed refetch used to be reported as if the save itself had failed, so
  // the row appeared and an error banner appeared with it. The resource keeps
  // its previous value and the next load picks the change up.
  const refresh = async (run: () => unknown) => {
    try {
      await run();
    } catch {
      // Stale rows are better than telling the user a save failed.
    }
  };

  const wrap = async (fn: () => Promise<void>, successKey?: string) => {
    setError("");
    setPending(true);
    try {
      await fn();
      if (successKey) setFlash(t(successKey as never));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  // Applying is best-effort: the request succeeds and reports the pairs it
  // could not attach, so a shortfall is a warning with a report, not an error.
  const applyBlueprint = async (classGrade: string) => {
    setError("");
    setSkipped([]);
    setPending(true);
    try {
      const result = await postClassBlueprintApply(id());
      await refresh(refetchCourses);
      setSkipped(result.skipped);
      if (result.skipped.length === 0) setFlash(t("classBlueprints.applied"));
    } catch (err) {
      // A 404 here means no blueprint covers this grade, not a missing class.
      if (err instanceof ApiError && err.status === 404) {
        setError(t("classBlueprints.noBlueprintForGrade", { grade: classGrade }));
      } else {
        setError(formatApiError(err));
      }
    } finally {
      setPending(false);
    }
  };

  // The table leads with the student number. On a phone DataTable renders
  // rows as cards titled by the first column, so there the name leads and the
  // number becomes a label/value line under it.
  const compactScreen = createMediaQuery(COMPACT_SCREEN_QUERY);
  const memberColumns = createMemo<ColumnDef<ClassMember>[]>(() => {
    const numberColumn: ColumnDef<ClassMember> = {
      id: "studentNumber",
      accessorFn: (row) => row.user.student_number?.trim() || "—",
      header: t("roster.studentNumber"),
      meta: { cellClass: "whitespace-nowrap tabular-nums text-muted-foreground" },
    };
    const studentColumn: ColumnDef<ClassMember> = {
      id: "student",
      accessorFn: (row) => personName(row.user),
      header: t("classGroups.student"),
      meta: { cellClass: "font-medium" },
    };
    return [
      ...(compactScreen() ? [studentColumn, numberColumn] : [numberColumn, studentColumn]),
      {
        id: "addedBy",
        accessorFn: (row) => personName(row.added_by),
        header: t("classGroups.addedBy"),
        meta: { cellClass: "text-muted-foreground" },
      },
      {
        id: "actions",
        header: t("common.actions"),
        meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "w-[110px] min-w-[110px] max-w-[110px] px-1 text-center" },
        cell: (cell) => (
          <Show when={canManage()}>
            <TableRowActions
              label={t("common.actions")}
              actions={[
                {
                  label: t("profile.viewProfile"),
                  icon: <IconExternalLink class="h-4 w-4" />,
                  onSelect: () => void navigate({ to: "/profile/$userId", params: { userId: cell.row.original.user.id } }),
                },
                { label: t("classGroups.removeStudent"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setRemoveMember(cell.row.original) },
              ]}
            />
          </Show>
        ),
      },
    ];
  });

  const courseColumns = createMemo<ColumnDef<ClassCourse>[]>(() => [
    {
      id: "course",
      accessorFn: (row) => courseTitle(row.course),
      header: t("classGroups.courseColumn"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "dersSaati",
      accessorFn: (row) => row.ders_saati,
      header: t("instances.dersSaati"),
      meta: { cellClass: "" },
    },
    {
      id: "roster",
      accessorFn: (row) => row.enrollment_count,
      header: t("courses.roster"),
      meta: { cellClass: "" },
    },
    {
      id: "attachedBy",
      accessorFn: (row) => personName(row.attached_by),
      header: t("classGroups.attachedBy"),
      meta: { cellClass: "text-muted-foreground" },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "w-[110px] min-w-[110px] max-w-[110px] px-1 text-center" },
      cell: (cell) => (
        <Show when={canManage()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[
              { label: t("instances.open"), icon: <IconExternalLink class="h-4 w-4" />, onSelect: () => void navigate({ to: "/instances/$id", params: { id: cell.row.original.id } }) },
              { label: t("classGroups.detachCourse"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDetachCourse(cell.row.original) },
            ]}
          />
        </Show>
      ),
    },
  ]);

  return (
    // Only a load that never produced a class becomes the error screen. A
    // refetch that fails after a save still has the class in hand, and
    // replacing the whole page there read as if the save had failed.
    <Show
      when={loadedClass()}
      fallback={
        <Show when={cls.error} fallback={<PageSpinner />}>
          <Show when={!isNotFoundError(cls.error)} fallback={<RecordNotFound backTo="/management/classes" />}>
            <Alert variant="destructive">{formatApiError(cls.error)}</Alert>
          </Show>
        </Show>
      }
    >
      {(c) => (
            <div class="mx-auto w-full max-w-[1440px] space-y-4">
              <section class="rounded-xl border border-border-line bg-surface-base px-4 py-3 shadow-xs sm:px-5">
                <Breadcrumbs items={[{ label: t("classGroups.title"), to: "/management/classes" }, { label: c().name }]} />
                <PageHeader
                  title={c().name}
                  actions={
                    canManage() ? (
                      <div class="flex w-full items-center gap-2 sm:w-auto">
                        {/* A grid gives both buttons the width of the wider one. */}
                        <div class="grid flex-1 grid-cols-2 gap-2 sm:flex-none">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            class={cn(ACTION_BUTTON, "w-full")}
                            disabled={pending()}
                            title={t("classBlueprints.applyHint")}
                            onClick={() => void applyBlueprint(gradeLevelLabel(c().grade_level, t))}
                          >
                            <IconListChecks class="h-4 w-4" />
                            {t("classBlueprints.apply")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            class={cn(ACTION_BUTTON, "w-full")}
                            onClick={() => setEditing(true)}
                          >
                            <IconEdit class="h-4 w-4" />
                            {t("common.edit")}
                          </Button>
                        </div>
                        <TableRowActions
                          label={t("common.actions")}
                          actions={[{
                            label: t("classGroups.deleteClass"),
                            icon: <IconTrash class="h-4 w-4" />,
                            destructive: true,
                            disabled: pending(),
                            onSelect: () => setDeleteOpen(true),
                          }]}
                        />
                      </div>
                    ) : undefined
                  }
                />
                <div class="grid gap-3 border-t border-border-hairline pt-3 pb-1 text-sm grid-cols-2 lg:grid-cols-5">
                  <div class={TILE}>
                    <p class={TILE_LABEL}>{t("classGroups.grade")}</p>
                    <p class={TILE_VALUE}>{gradeLevelLabel(c().grade_level, t)}</p>
                  </div>
                  <div class={TILE}>
                    <p class={TILE_LABEL}>{t("academicYears.year")}</p>
                    <p class={TILE_VALUE}>{yearName(c().year)}</p>
                  </div>
                  <div class={cn(TILE, "col-span-2 lg:col-span-1")}>
                    <p class={TILE_LABEL}>{t("classGroups.homeroomTeacher")}</p>
                    <p class={TILE_VALUE}>{c().teacher ? personName(c().teacher) : t("classGroups.noTeacher")}</p>
                  </div>
                  <div class={TILE}>
                    <p class={TILE_LABEL}>{t("classGroups.membersTab")}</p>
                    <p class={cn(TILE_VALUE, "tabular-nums")}>{membersPage.latest?.total ?? "—"}</p>
                  </div>
                  <div class={TILE}>
                    <p class={TILE_LABEL}>{t("classGroups.coursesTab")}</p>
                    <p class={cn(TILE_VALUE, "tabular-nums")}>{coursesPage.latest?.total ?? "—"}</p>
                  </div>
                </div>
              </section>

              <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
              <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
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
                onOpenChange={setReportOpen}
                skipped={skipped()}
                courseTitle={courseTitle}
              />

              <Tabs value={tab()} onChange={setTab} class="space-y-3">
                <TabsList class="grid w-full grid-cols-2 gap-0 rounded-lg border-border-line bg-surface-base p-0 shadow-none sm:w-auto sm:min-w-[22rem]">
                  <TabsTrigger value="members" class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconUsers class="h-4 w-4" />{t("classGroups.membersTab")}</TabsTrigger>
                  <TabsTrigger value="courses" class="min-w-0 rounded-none border-r border-border-line last:border-r-0 data-selected:border-b-2 data-selected:border-b-primary data-selected:bg-surface-base data-selected:shadow-none"><IconBook class="h-4 w-4" />{t("classGroups.coursesTab")}</TabsTrigger>
                </TabsList>

                <TabsContent value="members">
                  <section>
                    <Show when={membersPage.latest} fallback={<Show when={membersPage.error} fallback={<DataTableSkeleton />}><Alert variant="destructive">{formatApiError(membersPage.error)}</Alert></Show>}>
                      <DataTable
                        title={t("classGroups.membersTab")}
                        actions={canManage() ? (
                          <Button type="button" size="sm" variant="outline" class={ACTION_BUTTON} onClick={() => setShowAddMember(true)}>
                            <IconPlus class="h-4 w-4" />{t("classGroups.addStudent")}
                          </Button>
                        ) : undefined}
                        columns={memberColumns()}
                        data={members() ?? []}
                        searchPredicate={(row, query) => matchesSearch(query, row.user.display_name, row.user.username, row.user.student_number)}
                        filterPlaceholder={t("roster.searchStudents")}
                        filterHint={t("search.hint.classMembers")}
                        enablePagination
                        pageSize={10}
                        empty={t("classGroups.noMembers")}
                      />
                    </Show>
                  </section>
                </TabsContent>

                <TabsContent value="courses">
                  <section>
                    <Show when={coursesPage.latest} fallback={<Show when={coursesPage.error} fallback={<DataTableSkeleton />}><Alert variant="destructive">{formatApiError(coursesPage.error)}</Alert></Show>}>
                      <DataTable
                        title={t("classGroups.coursesTab")}
                        actions={canManage() ? (
                          <Button type="button" size="sm" variant="outline" class={ACTION_BUTTON} onClick={() => setShowAttachCourse(true)}>
                            <IconPlus class="h-4 w-4" />{t("classGroups.attachCourse")}
                          </Button>
                        ) : undefined}
                        columns={courseColumns()}
                        data={classCourses() ?? []}
                        filterColumn="course"
                        enablePagination
                        pageSize={10}
                        empty={t("classGroups.noCourses")}
                      />
                    </Show>
                  </section>
                </TabsContent>
              </Tabs>

              {/* Edit class */}
              <ClassEditPanel
                cls={c()}
                open={editing()}
                onOpenChange={setEditing}
                years={years.latest ?? []}
                maxNameLen={limits.latest?.course.max_class_name_len}
                minGradeLevel={limits.latest?.course.min_grade_level}
                maxGradeLevel={limits.latest?.course.max_grade_level}
                onSaved={async () => { setFlash(t("common.saved")); await refresh(refetchClass); }}
              />

              {/* Add student */}
              <SidePanel open={showAddMember()} onOpenChange={setShowAddMember} title={t("classGroups.addStudent")} description={t("classGroups.addStudentHelp")}>
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!addUserId().trim()) return; void wrap(async () => { await postClassMember(id(), { user_id: addUserId().trim() }); setAddUserId(""); setShowAddMember(false); await refresh(refetchMembers); }, "common.saved"); }}>
                  <UserSearchSelect id="class-add-student" role="student" value={addUserId()} excludeIds={memberUserIds()} placeholder={t("form.selectStudent")} onChange={setAddUserId} />
                  <div class="flex gap-2"><Button type="submit" disabled={pending()}>{t("classGroups.addStudent")}</Button><Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>{t("common.cancel")}</Button></div>
                </form>
              </SidePanel>

              {/* Attach course */}
              <SidePanel guardUnsaved open={showAttachCourse()} onOpenChange={setShowAttachCourse} title={t("classGroups.attachCourse")} description={t("classGroups.attachCourseHelp")}>
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); const cid = attachCourseId(); if (!cid) return; void wrap(async () => { await postClassInstance(id(), { course_id: cid }); setAttachCourseId(""); setShowAttachCourse(false); await refresh(refetchCourses); }, "common.saved"); }}>
                  <div class="space-y-1.5">
                    <Label for="class-attach-course">{t("classGroups.selectCourse")}</Label>
                    <Select id="class-attach-course" value={attachCourseId()} onChange={(e) => setAttachCourseId(e.currentTarget.value)}>
                      <option value="">{t("classGroups.selectCourse")}</option>
                      <For each={(courses.latest ?? []).filter((course) => !attachedCourseIds().includes(course.id))}>{(course) => <option value={course.id}>{course.title}</option>}</For>
                    </Select>
                  </div>
                  <div class="flex gap-2"><Button type="submit" disabled={pending() || !attachCourseId()}>{t("classGroups.attachCourse")}</Button><Button type="button" variant="outline" onClick={() => setShowAttachCourse(false)}>{t("common.cancel")}</Button></div>
                </form>
              </SidePanel>

              {/* Delete class */}
              <ConfirmDialog
                open={deleteOpen()}
                onOpenChange={setDeleteOpen}
                title={t("classGroups.deleteClass")}
                variant="destructive"
                summary={t("classGroups.deleteConfirm")}
                onConfirm={async () => { await wrap(async () => { await deleteClassById(id()); void navigate({ to: "/management/classes" }); }); }}
              />

              {/* Remove member */}
              <ConfirmDialog
                open={removeMember() !== null}
                onOpenChange={() => setRemoveMember(null)}
                title={t("classGroups.removeStudent")}
                variant="destructive"
                summary={t("classGroups.removeStudentConfirm", { name: removeMember() ? personName(removeMember()!.user) : "" })}
                onConfirm={async () => { const target = removeMember(); if (!target) return; await wrap(async () => { await deleteClassMember(id(), target.user.id); await refresh(refetchMembers); setRemoveMember(null); }, "common.deleted"); }}
              />

              {/* Detach course */}
              <ConfirmDialog
                open={detachCourse() !== null}
                onOpenChange={() => setDetachCourse(null)}
                title={t("classGroups.detachCourse")}
                variant="destructive"
                summary={t("classGroups.detachCourseConfirm", { course: detachCourse() ? courseTitle(detachCourse()!.course) : "" })}
                onConfirm={async () => { const target = detachCourse(); if (!target) return; await wrap(async () => { await deleteClassInstance(id(), target.id); await refresh(refetchCourses); setDetachCourse(null); }, "common.deleted"); }}
              />
            </div>
      )}
    </Show>
  );
}
