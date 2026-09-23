import { Show, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteInstanceTeacherByUserId, postInstanceTeacher } from "@/api/instances";
import { formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { IconPlus, IconTrash } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { createFlash } from "@/lib/flash";
import { useT } from "@/stores/preferences-context";

// Staffing is per instance now: a teacher runs this course *in this şube*, and
// the assignment carries no rights over the catalog course itself.
export function CourseTeachersPanel(props: {
  instanceId: string;
  teachers: PersonRef[];
  canStaff: boolean;
  assignOpen: boolean;
  onAssignOpenChange: (open: boolean) => void;
  onInstanceUpdated: () => void;
}) {
  const t = useT();
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
      header: t("roster.teacher"),
      meta: { cellClass: "font-medium" },
      cell: (cell) => cell.row.original.display_name || "—",
    },
    ...(props.canStaff
      ? [
          {
            id: "actions",
            header: t("common.actions"),
            meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
            cell: (cell: { row: { original: PersonRef } }) => (
              <TableRowActions
                label={t("common.actions")}
                actions={[{
                  label: t("courses.unassignTeacher"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setRemoveTarget(cell.row.original),
                }]}
              />
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
      await postInstanceTeacher(props.instanceId, teacherId);
      setFlash(t("courses.teacherAssigned"));
      setSelectedTeacherId("");
      props.onAssignOpenChange(false);
      props.onInstanceUpdated();
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
      await deleteInstanceTeacherByUserId(props.instanceId, target.id);
      setFlash(t("courses.teacherUnassigned"));
      setRemoveTarget(null);
      props.onInstanceUpdated();
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

      {/* The assign button rides in the table's toolbar card, so it stays
          reachable while the list is empty. */}
      <DataTable
        columns={columns()}
        data={props.teachers}
        storageKey="course-teachers"
        empty={t("courses.noTeachers")}
        emptyIllustration="people"
        actions={props.canStaff ? (
          <Button type="button" variant="outline" size="sm" class="rounded-lg" onClick={() => props.onAssignOpenChange(true)}>
            <IconPlus class="h-4 w-4" />{t("courses.assignTeacher")}
          </Button>
        ) : undefined}
      />

      <SidePanel
        open={props.assignOpen}
        onOpenChange={(open) => {
          props.onAssignOpenChange(open);
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
              onClick={() => props.onAssignOpenChange(false)}
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
