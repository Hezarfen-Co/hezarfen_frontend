import type { ColumnDef } from "@tanstack/solid-table";
import type { MealLedgerEntry } from "@/api/client";
import type { Locale } from "@/i18n/messages";
import { MealSectionHeading } from "@/components/meals/meal-section-heading";
import { DataTable } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/format";
import { formatTry, mealLedgerKindLabel } from "@/lib/meals";
import { useT } from "@/stores/preferences-context";

/** The student's latest canteen account movements (charges, credits, reversals). */
export function MealLedgerTable(props: { items: MealLedgerEntry[]; locale: Locale; moneyLocale: string }) {
  const t = useT();
  const columns: ColumnDef<MealLedgerEntry>[] = [
    {
      id: "kind",
      accessorFn: (row) => mealLedgerKindLabel(row.kind, t),
      header: t("meals.kind"),
      meta: { cellClass: "whitespace-nowrap font-medium" },
    },
    {
      id: "detail",
      accessorFn: (row) => row.note || row.method || "—",
      header: t("meals.detail"),
      meta: { cellClass: "max-w-0 truncate text-muted-foreground" },
    },
    {
      id: "when",
      accessorFn: (row) => row.created_at,
      header: t("meals.when"),
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => formatDateTime(cell.row.original.created_at, props.locale),
    },
    {
      id: "amount",
      accessorFn: (row) => row.amount_minor,
      header: t("meals.amount"),
      meta: { cellClass: "whitespace-nowrap font-medium tabular-nums" },
      cell: (cell) => `${cell.row.original.kind === "charge" ? "−" : "+"}${formatTry(cell.row.original.amount_minor, props.moneyLocale)}`,
    },
  ];
  return (
    <section class="space-y-3" aria-labelledby="meal-ledger-title">
      <MealSectionHeading id="meal-ledger-title" title={t("meals.ledger")} />
      <DataTable
        columns={columns}
        data={props.items}
        pageSize={5}
        emptyIllustration="meals"
        empty={t("meals.noLedger")}
      />
    </section>
  );
}
