import { For, Show, Suspense, createEffect, createMemo, createResource, createSignal } from "solid-js";
import { Link, useLocation, useNavigate, useParams } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  getClassById,
  patchClassById,
  deleteClassById,
  getClassMembers,
  postClassMember,
  deleteClassMember,
  getClassCourses,
  postClassCourse,
  deleteClassCourse,
  postClassBlueprintApply,
} from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getTerms } from "@/api/terms";
import { getLimits } from "@/api/limits";
import { ApiError, formatApiError, type BlueprintSkip, type ClassCourse, type ClassGroup, type ClassMember } from "@/api/client";
import { BlueprintSkippedReport } from "@/components/classes/blueprint-skipped-report";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconChevronLeft, IconExternalLink, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { useT } from "@/stores/preferences-context";

export default function ClassDetailPage() {
  return <RouteGuard><ClassDetailContent /></RouteGuard>;
}

function ClassDetailContent() {
  const auth = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ from: "/management/classes/$id" });
  const id = createMemo(() => { location(); return params().id; });
  const canManage = () => hasMinRole(auth.user()?.role, "manager");

  const [tab, setTab] = createSignal("members");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  const [editing, setEditing] = createSignal(false);
  const [name, setName] = createSignal("");
  const [grade, setGrade] = createSignal("");
  const [termId, setTermId] = createSignal("");
  const [teacherId, setTeacherId] = createSignal("");
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
  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  const [courses] = createResource(() => canManage() ? getCourses().then((page) => page.items) : null);
  const [members, { refetch: refetchMembers }] = createResource(id, async (classId) => (await getClassMembers(classId, { limit: 200 })).items);
  const [classCourses, { refetch: refetchCourses }] = createResource(id, async (classId) => (await getClassCourses(classId, { limit: 50 })).items);

  // The last class the page actually loaded. A refetch that fails leaves the
  // resource in an error state, and reading it there throws; holding the last
  // good value lets the page stay up and keeps the error screen for the case
  // it is meant for — a first load that never produced a class.
  const [loadedClass, setLoadedClass] = createSignal<ClassGroup>();
  createEffect(() => {
    if (cls.state === "ready") setLoadedClass(cls());
  });

  const termName = (tid: string | null) => terms.latest?.find((term) => term.id === tid)?.name ?? (tid || t("terms.unassigned"));
  const courseTitle = (courseId: string) => courses.latest?.find((course) => course.id === courseId)?.title ?? courseId;
  const memberUserIds = () => (members.latest ?? []).map((row) => row.user.id);
  const attachedCourseIds = () => (classCourses.latest ?? []).map((row) => row.course);

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

  const memberColumns = createMemo<ColumnDef<ClassMember>[]>(() => [
    {
      id: "student",
      accessorFn: (row) => personLabel(row.user),
      header: t("classGroups.student"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "addedBy",
      accessorFn: (row) => personLabel(row.added_by),
      header: t("classGroups.addedBy"),
      meta: { cellClass: "text-muted-foreground" },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
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
  ]);

  const courseColumns = createMemo<ColumnDef<ClassCourse>[]>(() => [
    {
      id: "course",
      accessorFn: (row) => courseTitle(row.course),
      header: t("classGroups.courseColumn"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "attachedBy",
      accessorFn: (row) => personLabel(row.attached_by),
      header: t("classGroups.attachedBy"),
      meta: { cellClass: "text-muted-foreground" },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
      cell: (cell) => (
        <Show when={canManage()}>
          <TableRowActions
            label={t("common.actions")}
            actions={[{ label: t("classGroups.detachCourse"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDetachCourse(cell.row.original) }]}
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
          <Alert variant="destructive">{formatApiError(cls.error)}</Alert>
        </Show>
      }
    >
      {(c) => (
            <div class="space-y-5">
              <Link to="/management/classes" class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <IconChevronLeft class="h-4 w-4" />{t("classGroups.title")}
              </Link>

              <header class="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                <div class="space-y-1">
                  <h1 class="text-2xl font-semibold tracking-tight">{c().name}</h1>
                  <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Show when={c().grade}><Badge variant="secondary" class="rounded-full">{c().grade}</Badge></Show>
                    <span>{termName(c().term)}</span>
                    <span>·</span>
                    <span>{t("classGroups.homeroomTeacher")}: {c().teacher ? personLabel(c().teacher!) : t("classGroups.noTeacher")}</span>
                  </div>
                </div>
                <Show when={canManage()}>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      class="rounded-lg"
                      disabled={pending() || !c().grade}
                      title={c().grade ? t("classBlueprints.applyHint") : t("classBlueprints.applyNoGrade")}
                      onClick={() => void applyBlueprint(c().grade ?? "")}
                    >
                      {t("classBlueprints.apply")}
                    </Button>
                    <Button size="sm" variant="outline" class="rounded-lg" onClick={() => { setName(c().name); setGrade(c().grade ?? ""); setTermId(c().term ?? ""); setTeacherId(c().teacher?.id ?? ""); setEditing(true); }}>{t("common.edit")}</Button>
                    <Button size="sm" variant="outline" class="rounded-lg text-destructive" onClick={() => setDeleteOpen(true)}>{t("classGroups.deleteClass")}</Button>
                  </div>
                </Show>
              </header>

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
                <TabsList>
                  <TabsTrigger value="members">{t("classGroups.membersTab")}</TabsTrigger>
                  <TabsTrigger value="courses">{t("classGroups.coursesTab")}</TabsTrigger>
                </TabsList>

                <TabsContent value="members" class="space-y-3">
                  <Show when={canManage()}>
                    <div class="flex justify-end">
                      <Button size="sm" variant="outline" class="rounded-lg" onClick={() => setShowAddMember(true)}><IconPlus class="h-4 w-4" />{t("classGroups.addStudent")}</Button>
                    </div>
                  </Show>
                  <Suspense fallback={<DataTableSkeleton />}>
                    <DataTable columns={memberColumns()} data={members.latest ?? []} filterColumn="student" enablePagination pageSize={10} empty={t("classGroups.noMembers")} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="courses" class="space-y-3">
                  <Show when={canManage()}>
                    <div class="flex justify-end">
                      <Button size="sm" variant="outline" class="rounded-lg" onClick={() => setShowAttachCourse(true)}><IconPlus class="h-4 w-4" />{t("classGroups.attachCourse")}</Button>
                    </div>
                  </Show>
                  <Suspense fallback={<DataTableSkeleton />}>
                    <DataTable columns={courseColumns()} data={classCourses.latest ?? []} filterColumn="course" enablePagination pageSize={10} empty={t("classGroups.noCourses")} />
                  </Suspense>
                </TabsContent>
              </Tabs>

              {/* Edit class */}
              <SidePanel open={editing()} onOpenChange={setEditing} title={t("common.edit")} description={c().name}>
                <form class="space-y-4" onSubmit={(e) => { e.preventDefault(); void wrap(async () => { await patchClassById(id(), { name: name().trim(), grade: grade().trim() || null, term_id: termId() || null, teacher_id: teacherId() || null }); setEditing(false); await refresh(refetchClass); }, "common.saved"); }}>
                  <div class="space-y-3">
                    <div class="space-y-1.5"><Label for="edit-class-name">{t("classGroups.className")}</Label><Input id="edit-class-name" maxlength={limits.latest?.course.max_class_name_len} value={name()} onInput={(e) => setName(e.currentTarget.value)} /></div>
                    <div class="space-y-1.5"><Label for="edit-class-grade">{t("classGroups.grade")}</Label><Input id="edit-class-grade" maxlength={limits.latest?.course.max_class_grade_len} value={grade()} onInput={(e) => setGrade(e.currentTarget.value)} /></div>
                    <div class="space-y-1.5"><Label for="edit-class-term">{t("terms.term")}</Label><Select id="edit-class-term" value={termId()} onChange={(e) => setTermId(e.currentTarget.value)}><option value="">{t("terms.unassigned")}</option><For each={terms.latest ?? []}>{(term) => <option value={term.id}>{term.name}</option>}</For></Select></div>
                    <UserSearchSelect id="edit-class-teacher" label={t("classGroups.homeroomTeacher")} value={teacherId()} onChange={setTeacherId} placeholder={t("classGroups.selectTeacher")} role="teacher" />
                  </div>
                  <div class="flex gap-2 border-t pt-4"><Button type="submit" disabled={pending()}>{t("common.save")}</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button></div>
                </form>
              </SidePanel>

              {/* Add student */}
              <SidePanel open={showAddMember()} onOpenChange={setShowAddMember} title={t("classGroups.addStudent")} description={t("classGroups.addStudentHelp")}>
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); if (!addUserId().trim()) return; void wrap(async () => { await postClassMember(id(), { user_id: addUserId().trim() }); setAddUserId(""); setShowAddMember(false); await refresh(refetchMembers); }, "common.saved"); }}>
                  <UserSearchSelect id="class-add-student" role="student" value={addUserId()} excludeIds={memberUserIds()} placeholder={t("form.selectStudent")} onChange={setAddUserId} />
                  <div class="flex gap-2"><Button type="submit" disabled={pending()}>{t("classGroups.addStudent")}</Button><Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>{t("common.cancel")}</Button></div>
                </form>
              </SidePanel>

              {/* Attach course */}
              <SidePanel open={showAttachCourse()} onOpenChange={setShowAttachCourse} title={t("classGroups.attachCourse")} description={t("classGroups.attachCourseHelp")}>
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); const cid = attachCourseId(); if (!cid) return; void wrap(async () => { await postClassCourse(id(), { course_id: cid }); setAttachCourseId(""); setShowAttachCourse(false); await refresh(refetchCourses); }, "common.saved"); }}>
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
                summary={t("classGroups.removeStudentConfirm", { name: removeMember() ? personLabel(removeMember()!.user) : "" })}
                onConfirm={async () => { const target = removeMember(); if (!target) return; await wrap(async () => { await deleteClassMember(id(), target.user.id); await refresh(refetchMembers); setRemoveMember(null); }, "common.deleted"); }}
              />

              {/* Detach course */}
              <ConfirmDialog
                open={detachCourse() !== null}
                onOpenChange={() => setDetachCourse(null)}
                title={t("classGroups.detachCourse")}
                variant="destructive"
                summary={t("classGroups.detachCourseConfirm", { course: detachCourse() ? courseTitle(detachCourse()!.course) : "" })}
                onConfirm={async () => { const target = detachCourse(); if (!target) return; await wrap(async () => { await deleteClassCourse(id(), target.course); await refresh(refetchCourses); setDetachCourse(null); }, "common.deleted"); }}
              />
            </div>
      )}
    </Show>
  );
}
