import { Show, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteCourseTeacherByUserId, postCourseTeacher } from "@/api/courses";
import { formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { useT } from "@/stores/preferences-context";

export function CourseTeachersPanel(props: {
  courseId: string;
  teachers: PersonRef[];
  canStaff: boolean;
  onCourseUpdated: () => void;
}) {
  const t = useT();
  const [showAssignPanel, setShowAssignPanel] = createSignal(false);
  const [selectedTeacherId, setSelectedTeacherId] = createSignal("");
  const [removeTarget, setRemoveTarget] = createSignal<PersonRef | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const assignedUserIds = createMemo(() => props.teachers.map((teacher) => teacher.id));

  const columns = createMemo<ColumnDef<PersonRef>[]>(() => [
    {
      id: "name",
      accessorFn: (row) => row.display_name || row.username,
      header: t("admin.username"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => cell.row.original.display_name || cell.row.original.username,
    },
    {
      id: "id",
      accessorFn: (row) => row.id,
      header: t("admin.id"),
      meta: { cellClass: "mono text-xs text-muted-foreground" },
      cell: (cell) => cell.row.original.id,
    },
    ...(props.canStaff
      ? [
          {
            id: "actions",
            header: t("common.actions"),
            meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
            cell: (cell: { row: { original: PersonRef } }) => (
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => setRemoveTarget(cell.row.original)}
              >
                <IconTrash class="h-4 w-4" />
                <span class="sr-only">{t("courses.unassignTeacher")}</span>
              </Button>
            ),
          },
        ]
      : []),
  ]);

  const handleAssign = async (e: Event) => {
    e.preventDefault();
    const teacherId = selectedTeacherId();
    if (!teacherId) return;

    setPending(true);
    setError("");

    try {
      await postCourseTeacher(props.courseId, teacherId);
      setFlash(t("courses.teacherAssigned"));
      setSelectedTeacherId("");
      setShowAssignPanel(false);
      props.onCourseUpdated();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleUnassign = async () => {
    const target = removeTarget();
    if (!target) return;

    setPending(true);
    setError("");

    try {
      await deleteCourseTeacherByUserId(props.courseId, target.id);
      setFlash(t("courses.teacherUnassigned"));
      setRemoveTarget(null);
      props.onCourseUpdated();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-4">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <div class="flex items-center justify-between">
        <h3 class="text-sm font-semibold">{t("courses.teachers")}</h3>
        <Show when={props.canStaff}>
          <Button size="sm" onClick={() => setShowAssignPanel(true)}>
            <IconPlus class="mr-1.5 h-4 w-4" />
            {t("courses.assignTeacher")}
          </Button>
        </Show>
      </div>

      <Show
        when={props.teachers.length > 0}
        fallback={
          <EmptyState
            title={t("courses.noTeachers")}
            description=""
            action={
              props.canStaff ? (
                <Button size="sm" onClick={() => setShowAssignPanel(true)}>
                  <IconPlus class="mr-1.5 h-4 w-4" />
                  {t("courses.assignTeacher")}
                </Button>
              ) : undefined
            }
          />
        }
      >
        <DataTable columns={columns()} data={props.teachers} />
      </Show>

      <SidePanel
        open={showAssignPanel()}
        onOpenChange={(open) => {
          setShowAssignPanel(open);
          if (!open) {
            setSelectedTeacherId("");
            setError("");
          }
        }}
        title={t("courses.assignTeacher")}
      >
        <form onSubmit={handleAssign} class="space-y-4">
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>

          <div class="space-y-1.5">
            <UserSearchSelect
              id="course-teacher-select"
              role="teacher"
              value={selectedTeacherId()}
              onChange={setSelectedTeacherId}
              excludeIds={assignedUserIds()}
              placeholder={t("courses.assignTeacher")}
            />
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAssignPanel(false)}
              disabled={pending()}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending() || !selectedTeacherId()}>
              {pending() ? t("common.loading") : t("courses.assignTeacher")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={Boolean(removeTarget())}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={t("courses.unassignTeacher")}
        summary={t("courses.confirmUnassignTeacher")}
        confirmLabel={t("common.remove")}
        variant="destructive"
        onConfirm={handleUnassign}
      />
    </div>
  );
}
