import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
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
} from "@/api/classes";
import { getCourses } from "@/api/courses";
import { getTerms } from "@/api/terms";
import { getLimits } from "@/api/limits";
import { formatApiError, type ClassCourse, type ClassMember } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { IconChevronLeft, IconPlus, IconTrash } from "@/components/ui/icons";
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

  const [cls, { refetch: refetchClass }] = createResource(id, (classId) => getClassById(classId));
  const [terms] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const [limits] = createResource(() => canManage() ? getLimits() : null);
  const [courses] = createResource(() => canManage() ? getCourses().then((page) => page.items) : null);
  const [members, { refetch: refetchMembers }] = createResource(id, async (classId) => (await getClassMembers(classId, { limit: 200 })).items);
  const [classCourses, { refetch: refetchCourses }] = createResource(id, async (classId) => (await getClassCourses(classId, { limit: 50 })).items);

  const termName = (tid: string | null) => terms.latest?.find((term) => term.id === tid)?.name ?? (tid || t("terms.unassigned"));
  const courseTitle = (courseId: string) => courses.latest?.find((course) => course.id === courseId)?.title ?? courseId;
  const memberUserIds = () => (members.latest ?? []).map((row) => row.user.id);
  const attachedCourseIds = () => (classCourses.latest ?? []).map((row) => row.course);

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
            actions={[{ label: t("classGroups.removeStudent"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setRemoveMember(cell.row.original) }]}
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
    <Suspense fallback={<PageSpinner />}>
      <Show when={cls.error} fallback={
        <Show when={cls()}>
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
                    <Button size="sm" variant="outline" class="rounded-lg" onClick={() => { setName(c().name); setGrade(c().grade ?? ""); setTermId(c().term ?? ""); setTeacherId(c().teacher?.id ?? ""); setEditing(true); }}>{t("common.edit")}</Button>
                    <Button size="sm" variant="outline" class="rounded-lg text-destructive" onClick={() => setDeleteOpen(true)}>{t("classGroups.deleteClass")}</Button>
                  </div>
                </Show>
              </header>

              <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
              <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>

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
                <form class="space-y-4" onSubmit={(e) => { e.preventDefault(); void wrap(async () => { await patchClassById(id(), { name: name().trim(), grade: grade().trim() || null, term_id: termId() || null, teacher_id: teacherId() || null }); setEditing(false); await refetchClass(); }, "common.saved"); }}>
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
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); void wrap(async () => { const uid = addUserId().trim(); if (!uid) return; await postClassMember(id(), { user_id: uid }); setAddUserId(""); setShowAddMember(false); await refetchMembers(); }, "common.saved"); }}>
                  <UserSearchSelect id="class-add-student" role="student" value={addUserId()} excludeIds={memberUserIds()} placeholder={t("form.selectStudent")} onChange={setAddUserId} />
                  <div class="flex gap-2"><Button type="submit" disabled={pending()}>{t("classGroups.addStudent")}</Button><Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>{t("common.cancel")}</Button></div>
                </form>
              </SidePanel>

              {/* Attach course */}
              <SidePanel open={showAttachCourse()} onOpenChange={setShowAttachCourse} title={t("classGroups.attachCourse")} description={t("classGroups.attachCourseHelp")}>
                <form class="space-y-3" onSubmit={(e) => { e.preventDefault(); void wrap(async () => { const cid = attachCourseId(); if (!cid) return; await postClassCourse(id(), { course_id: cid }); setAttachCourseId(""); setShowAttachCourse(false); await refetchCourses(); }, "common.saved"); }}>
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
                onConfirm={async () => { const target = removeMember(); if (!target) return; await wrap(async () => { await deleteClassMember(id(), target.user.id); await refetchMembers(); setRemoveMember(null); }, "common.deleted"); }}
              />

              {/* Detach course */}
              <ConfirmDialog
                open={detachCourse() !== null}
                onOpenChange={() => setDetachCourse(null)}
                title={t("classGroups.detachCourse")}
                variant="destructive"
                summary={t("classGroups.detachCourseConfirm", { course: detachCourse() ? courseTitle(detachCourse()!.course) : "" })}
                onConfirm={async () => { const target = detachCourse(); if (!target) return; await wrap(async () => { await deleteClassCourse(id(), target.course); await refetchCourses(); setDetachCourse(null); }, "common.deleted"); }}
              />
            </div>
          )}
        </Show>
      }>
        <Alert variant="destructive">{formatApiError(cls.error)}</Alert>
      </Show>
    </Suspense>
  );
}
