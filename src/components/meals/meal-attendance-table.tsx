import type { ColumnDef } from "@tanstack/solid-table";
import type { MealAttendance } from "@/api/client";
import type { Locale } from "@/i18n/messages";
import { MealSectionHeading } from "@/components/meals/meal-section-heading";
import { DataTable } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/format";
import { mealServiceStatusLabel } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** The student's recent meal service marks (served / missed) across menus. */
export function MealAttendanceTable(props: { items: MealAttendance[]; locale: Locale }) {
  const t = useT();
  const columns: ColumnDef<MealAttendance>[] = [
    {
      id: "status",
      accessorFn: (row) => mealServiceStatusLabel(row.status, t),
      header: t("meals.status"),
      meta: { cellClass: "whitespace-nowrap font-medium" },
    },
    {
      id: "when",
      accessorFn: (row) => row.marked_at,
      header: t("meals.when"),
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => formatDateTime(cell.row.original.marked_at, props.locale),
    },
  ];
  return (
    <section class="space-y-3" aria-labelledby="meal-attendance-title">
      <MealSectionHeading id="meal-attendance-title" title={t("meals.attendance")} />
      <DataTable
        columns={columns}
        data={props.items}
        pageSize={5}
        emptyIllustration="meals"
        empty={t("meals.noAttendance")}
      />
    </section>
  );
}
