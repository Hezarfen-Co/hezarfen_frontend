import { Show, Suspense, createMemo, createResource } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getHomeworkReport } from "@/api/homework";
import type { HomeworkReportEntry } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

export function HomeworkReportView(props: { userId: string }) {
  const t = useT();
  const { locale } = usePreferences();
  const [report] = createResource(() => props.userId, async (userId) => getHomeworkReport(userId, { limit: 100 }));
  const statusLabel = (row: HomeworkReportEntry) => {
    if (row.missing) return t("homework.status.missing");
    if (!row.submitted) return t("homework.notSubmitted");
    if (row.result?.status === "done") return t("homework.status.done");
    if (row.result?.status === "incomplete") return t("homework.status.incomplete");
    return t("homework.submitted");
  };
  const columns = createMemo<ColumnDef<HomeworkReportEntry>[]>(() => [
    { accessorKey: "title", header: t("form.title"), meta: { cellClass: "font-medium" } },
    { accessorKey: "subject", header: t("subjects.subject") },
    {
      id: "due_at",
      accessorFn: (row) => row.due_at,
      header: t("homework.dueAt"),
      meta: { cellClass: "mono whitespace-nowrap text-xs text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.due_at, locale()),
    },
    {
      id: "status",
      header: t("events.status"),
      cell: (cell) => <Badge variant="outline" class="rounded-full">{statusLabel(cell.row.original)}</Badge>,
    },
    {
      id: "late",
      header: t("homework.late"),
      cell: (cell) => cell.row.original.late ? t("common.done") : "—",
    },
    {
      id: "mark",
      header: t("form.mark"),
      meta: { cellClass: "text-right font-medium tabular-nums" },
      cell: (cell) => cell.row.original.result?.mark ?? "—",
    },
  ]);

  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <Show when={(report()?.items ?? []).length > 0} fallback={<EmptyState title={t("homework.empty")} />}>
        <DataTable columns={columns()} data={report()?.items ?? []} filterColumn="title" enablePagination pageSize={10} empty={t("homework.empty")} />
      </Show>
    </Suspense>
  );
}
