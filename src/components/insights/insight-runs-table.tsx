import { createMemo } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { InsightRun } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { usePreferences } from "@/stores/preferences-context";

function statusVariant(status: string) {
  if (status === "ok") return "success" as const;
  if (status === "running") return "info" as const;
  if (status === "partial" || status === "skipped") return "warning" as const;
  if (status === "failed") return "destructive" as const;
  return "secondary" as const;
}

export function InsightRunsTable(props: { runs: InsightRun[] }) {
  const prefs = usePreferences();
  const tx = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const statusLabel = (status: string) =>
    ["running", "ok", "partial", "failed", "skipped"].includes(status)
      ? tx(`insights.status.${status}`)
      : status;
  const columns = createMemo<ColumnDef<InsightRun>[]>(() => [
    {
      accessorKey: "run_day",
      header: tx("insights.runDay"),
      cell: (cell) => (
        <div>
          <p class="font-medium text-text-strong">{cell.row.original.run_day}</p>
          <p class="text-xs text-muted-foreground">{formatDateTime(cell.row.original.started_at, prefs.locale())}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: tx("insights.result"),
      cell: (cell) => (
        <Badge variant={statusVariant(cell.row.original.status)} class="rounded-full">
          {statusLabel(cell.row.original.status)}
        </Badge>
      ),
    },
    {
      id: "processed",
      header: tx("insights.processed"),
      accessorFn: (row) => row.students_ok,
      meta: { align: "right" },
      cell: (cell) => {
        const run = cell.row.original;
        return (
          <div class="text-right">
            <p class="mono font-medium tabular-nums">{run.students_ok}/{run.students_total}</p>
            <p class="text-[11px] text-muted-foreground">{run.students_failed} / {run.students_skipped}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "rows_written",
      header: tx("insights.written"),
      meta: { align: "right", cellClass: "mono tabular-nums" },
    },
    {
      accessorKey: "duration_ms",
      header: tx("insights.duration"),
      meta: { align: "right" },
      cell: (cell) => <span class="mono tabular-nums">{formatDurationMinutes(cell.row.original.duration_ms, prefs.locale())}</span>,
    },
    {
      id: "issues",
      header: tx("insights.issues"),
      enableSorting: false,
      cell: (cell) => {
        const run = cell.row.original;
        const issueCount = run.pending_students.length + run.failed_modules.length;
        return (
          <div class="space-y-1">
            <p class={cn("text-xs", issueCount > 0 || run.budget_exceeded ? "text-warning" : "text-muted-foreground")}>
              {issueCount > 0 ? tx("insights.issueCount", { count: issueCount }) : tx("insights.noIssues")}
            </p>
            {run.budget_exceeded && <p class="text-[11px] text-warning">{tx("insights.budgetExceeded")}</p>}
            {run.pending_students.length > 0 && (
              <p class="max-w-56 truncate text-[11px] text-muted-foreground" title={run.pending_students.join(", ")}>
                {tx("insights.pendingStudents", { count: run.pending_students.length })}
              </p>
            )}
            {run.failed_modules.length > 0 && (
              <p class="max-w-56 truncate text-[11px] text-muted-foreground" title={run.failed_modules.join(", ")}>
                {tx("insights.failedModules", { modules: run.failed_modules.join(", ") })}
              </p>
            )}
          </div>
        );
      },
    },
  ]);

  return (
    <DataTable
      title={tx("insights.runs")}
      description={tx("insights.runsSubtitle")}
      columns={columns()}
      data={props.runs}
      empty={tx("insights.emptyRuns")}
      tableClass="min-w-[820px]"
      enablePagination
      pageSize={10}
      storageKey="insight-runs"
    />
  );
}
