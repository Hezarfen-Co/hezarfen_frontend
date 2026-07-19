import { Show, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { Attendance } from "@/api/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { Badge } from "@/components/ui/badge";
import { getAttendanceStatusMeta } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { personId, personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

export function AttendanceTable(props: {
  rows: Attendance[];
  emptyLabel?: string;
  canRemove?: boolean;
  onRemove?: (userId: string) => Promise<void>;
}) {
  const t = useT();
  const [targetUser, setTargetUser] = createSignal<string | null>(null);
  const columns = createMemo<ColumnDef<Attendance>[]>(() => [
    {
      id: "attendee",
      accessorFn: (row) => personLabel(row.user),
      header: t("events.attendee"),
      cell: (cell) => <span class="font-medium">{personLabel(cell.row.original.user)}</span>,
    },
    {
      accessorKey: "status",
      header: t("events.status"),
      cell: (cell) => {
        const meta = getAttendanceStatusMeta(cell.row.original.status);
        return (
          <Badge variant="outline" class={cn("gap-1 rounded-full border px-2.5 py-1 normal-case", meta?.class)}>
            <span>{meta ? t(meta.key) : cell.row.original.status}</span>
            <Show when={meta}>{(known) => <span class="font-normal opacity-75">· {t(known().detailKey)}</span>}</Show>
          </Badge>
        );
      },
    },
    {
      id: "marked_by",
      accessorFn: (row) => personLabel(row.marked_by),
      header: t("events.markedBy"),
      cell: (cell) => <span class="text-sm text-muted-foreground">{personLabel(cell.row.original.marked_by)}</span>,
    },
    ...(props.canRemove && props.onRemove
      ? [{
          id: "actions",
          header: t("common.actions"),
          meta: { headerClass: "w-14 text-center", cellClass: "px-1 text-center" },
          cell: (cell) => (
            <TableRowActions
              label={t("common.actions")}
              actions={[
                {
                  label: t("common.remove"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => setTargetUser(personId(cell.row.original.user)),
                },
              ]}
            />
          ),
        } satisfies ColumnDef<Attendance>]
      : []),
  ]);

  return (
    <>
      <Show
        when={props.rows.length > 0}
        fallback={
          <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {props.emptyLabel ?? t("events.noAttendance")}
          </p>
        }
      >
        <DataTable columns={columns()} data={props.rows} filterColumn="attendee" enablePagination pageSize={10} />
      </Show>

      <ConfirmDialog
        open={targetUser() != null}
        onOpenChange={(open) => {
          if (!open) setTargetUser(null);
        }}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("confirm.removeAttendance", { user: targetUser() ?? "" })}
        onConfirm={async () => {
          const userId = targetUser();
          if (!userId) return;
          await props.onRemove?.(userId);
          setTargetUser(null);
        }}
      />
    </>
  );
}
