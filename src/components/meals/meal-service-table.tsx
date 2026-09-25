import type { ColumnDef } from "@tanstack/solid-table";
import { Show } from "solid-js";
import type { MealBooking } from "@/api/client";
import type { MealServiceEntry } from "@/components/meals/meal-service-table.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MealSectionHeading } from "@/components/meals/meal-section-heading";
import { DataTable } from "@/components/ui/data-table";
import { IconCheck, IconPlus, IconTrash, IconX } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { mealBookingStateLabel, mealServiceStatusLabel } from "@/lib/meals";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const ACTIONS_CLASS = "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap";

/**
 * The serving desk's list: who booked (manager audit), who was served or
 * missed, one-tap marks per row, walk-ins from the header.
 */
export function MealServiceTable(props: {
  entries: MealServiceEntry[];
  canManage: boolean;
  pending: boolean;
  onMark: (studentId: string, status: "served" | "missed") => void;
  onCancelBooking: (booking: MealBooking) => void;
  onAddWalkIn: () => void;
}) {
  const t = useT();
  const bookingCell = (entry: MealServiceEntry) =>
    entry.booking ? mealBookingStateLabel(entry.booking.status, t) : t("meals.walkIn");
  const columns = (): ColumnDef<MealServiceEntry>[] => [
    {
      id: "student",
      accessorFn: (row) => personLabel(row.student),
      header: t("meals.student"),
      meta: { cellClass: "max-w-0 truncate font-medium" },
    },
    {
      id: "booking",
      accessorFn: bookingCell,
      header: t("meals.bookingStatus"),
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => (
        <span class={cell.row.original.booking?.status === "cancelled" ? "text-muted-foreground line-through" : undefined}>
          {bookingCell(cell.row.original)}
        </span>
      ),
    },
    {
      id: "service",
      accessorFn: (row) => row.attendance?.status ?? "",
      header: t("meals.serviceStatus"),
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => {
        const status = () => cell.row.original.attendance?.status;
        return (
          <Show when={status()} fallback={<span class="text-muted-foreground">{t("meals.notMarked")}</span>}>
            <Badge variant={status() === "served" ? "success" : status() === "missed" ? "warning" : "secondary"}>
              {mealServiceStatusLabel(status()!, t)}
            </Badge>
          </Show>
        );
      },
    },
    {
      id: "mark",
      header: t("meals.mark"),
      enableSorting: false,
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => {
        const status = () => cell.row.original.attendance?.status;
        return (
          <div class="flex gap-1.5">
            <Button
              size="sm"
              variant={status() === "served" ? "default" : "outline"}
              class="rounded-lg"
              disabled={props.pending}
              aria-pressed={status() === "served"}
              onClick={(event) => { event.stopPropagation(); props.onMark(cell.row.original.student.id, "served"); }}
            >
              <IconCheck class="h-3.5 w-3.5" />
              {t("meals.served")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              class={status() === "missed" ? "rounded-lg border-warning/60 bg-warning/10 text-warning-text" : "rounded-lg"}
              disabled={props.pending}
              aria-pressed={status() === "missed"}
              onClick={(event) => { event.stopPropagation(); props.onMark(cell.row.original.student.id, "missed"); }}
            >
              <IconX class="h-3.5 w-3.5" />
              {t("meals.missed")}
            </Button>
          </div>
        );
      },
    },
    ...(props.canManage
      ? [{
          id: "actions",
          header: t("common.actions"),
          enableSorting: false,
          meta: { headerClass: ACTIONS_CLASS, cellClass: ACTIONS_CLASS },
          cell: (cell) => (
            <Show when={cell.row.original.booking?.status === "booked"}>
              <TableRowActions
                label={t("common.actions")}
                actions={[{
                  label: t("meals.cancelBooking"),
                  icon: <IconTrash class="h-4 w-4" />,
                  destructive: true,
                  onSelect: () => props.onCancelBooking(cell.row.original.booking!),
                }]}
              />
            </Show>
          ),
        } satisfies ColumnDef<MealServiceEntry>]
      : []),
  ];
  return (
    <section class="space-y-3" aria-labelledby="meal-service-title">
      <MealSectionHeading id="meal-service-title" title={t("meals.service")} description={t("meals.serviceHelp")} />
      <DataTable
        actions={
          <Button variant="outline" size="sm" class="rounded-lg" onClick={props.onAddWalkIn}>
            <IconPlus class="h-4 w-4" />
            {t("meals.addWalkIn")}
          </Button>
        }
        columns={columns()}
        data={props.entries}
        searchPredicate={(row, query) => personLabel(row.student).toLocaleLowerCase().includes(query.toLocaleLowerCase())}
        filterHint={t("meals.student")}
        pageSize={20}
        emptyIllustration="meals"
        empty={t("meals.noService")}
      />
    </section>
  );
}
