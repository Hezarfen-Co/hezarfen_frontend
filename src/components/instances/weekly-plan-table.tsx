import { createMemo } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { WeeklySlot } from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { IconTrash } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { minutesToHHmm, sortSlots, weekdayLabel } from "@/lib/weekly-plan";
import { usePreferences, useT } from "@/stores/preferences-context";

/** A weekly plan's slots, weekday first; removable when `onRemove` is given. */
export function WeeklyPlanTable(props: { slots: WeeklySlot[]; onRemove?: (slot: WeeklySlot) => void; empty?: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const rows = createMemo(() => sortSlots(props.slots));
  const columns = createMemo<ColumnDef<WeeklySlot>[]>(() => [
    {
      id: "weekday",
      accessorFn: (row) => row.weekday,
      header: t("weeklyPlan.weekday"),
      meta: { cellClass: "font-medium whitespace-nowrap" },
      cell: (cell) => weekdayLabel(cell.row.original.weekday, locale()),
    },
    {
      id: "time",
      accessorFn: (row) => row.starts_at,
      header: t("weeklyPlan.time"),
      meta: { cellClass: "font-mono whitespace-nowrap" },
      cell: (cell) => `${minutesToHHmm(cell.row.original.starts_at)}–${minutesToHHmm(cell.row.original.ends_at)}`,
    },
    {
      id: "topic",
      accessorFn: (row) => row.topic ?? "",
      header: t("weeklyPlan.topic"),
      meta: { cellClass: "text-muted-foreground" },
      cell: (cell) => cell.row.original.topic || "—",
    },
    ...(props.onRemove
      ? [
          {
            id: "actions",
            header: t("common.actions"),
            meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
            cell: (cell) => (
              <TableRowActions
                label={t("common.actions")}
                actions={[{ label: t("weeklyPlan.removeSlot"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => props.onRemove?.(cell.row.original) }]}
              />
            ),
          } satisfies ColumnDef<WeeklySlot>,
        ]
      : []),
  ]);
  return <DataTable columns={columns()} data={rows()} empty={props.empty ?? t("weeklyPlan.empty")} />;
}
