import { Show, createMemo, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { InsightRun } from "@/api/client";
import { InsightRunReport } from "@/components/insights/insight-run-report";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { IconFileText } from "@/components/ui/icons";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { runReportText, type RunReportKey } from "@/i18n/insights-run-report";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { failedStageText, runReportStatusLabel } from "@/lib/insight-run-report";
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
  const rtx = (key: RunReportKey, vars?: Record<string, string | number>) =>
    runReportText(prefs.locale(), key, vars);
  const [selectedRun, setSelectedRun] = createSignal<InsightRun | null>(null);
  const columns = createMemo<ColumnDef<InsightRun>[]>(() => [
    {
      accessorKey: "run_day",
      header: tx("insights.runDay"),
      meta: { align: "center" },
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
      meta: { align: "center" },
      cell: (cell) => (
        <Badge variant={statusVariant(cell.row.original.status)} class="rounded-full">
          {runReportStatusLabel(prefs.locale(), cell.row.original.status)}
        </Badge>
      ),
    },
    {
      id: "processed",
      header: tx("insights.processed"),
      accessorFn: (row) => row.students_ok,
      meta: { align: "center" },
      cell: (cell) => {
        const run = cell.row.original;
        return (
          <div class="text-center">
            <p class="mono font-medium tabular-nums">{run.students_ok}/{run.students_total}</p>
            <p class="text-[11px] text-muted-foreground">{run.students_failed} / {run.students_skipped}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "rows_written",
      header: tx("insights.written"),
      meta: { align: "center", cellClass: "mono tabular-nums" },
    },
    {
      accessorKey: "duration_ms",
      header: tx("insights.duration"),
      meta: { align: "center" },
      cell: (cell) => <span class="mono tabular-nums">{formatDurationMinutes(cell.row.original.duration_ms, prefs.locale())}</span>,
    },
    {
      id: "issues",
      header: tx("insights.issues"),
      enableSorting: false,
      meta: { align: "center" },
      cell: (cell) => {
        const run = cell.row.original;
        const issueCount = run.pending_students.length + run.failed_modules.length;
        return (
          <div class="space-y-1 text-center">
            <p class={cn("text-xs", issueCount > 0 || run.budget_exceeded ? "text-warning-text" : "text-muted-foreground")}>
              {issueCount > 0 ? tx("insights.issueCount", { count: issueCount }) : tx("insights.noIssues")}
            </p>
            {run.budget_exceeded && <p class="text-[11px] text-warning-text">{tx("insights.budgetExceeded")}</p>}
            {run.pending_students.length > 0 && (
              <p class="max-w-56 truncate text-[11px] text-muted-foreground" title={run.pending_students.join(", ")}>
                {tx("insights.pendingStudents", { count: run.pending_students.length })}
              </p>
            )}
            {run.failed_modules.length > 0 && (
              <p class="max-w-56 truncate text-[11px] text-muted-foreground" title={run.failed_modules.join(", ")}>
                {tx("insights.failedModules", {
                  modules: run.failed_modules.map((stage) => failedStageText(prefs.locale(), stage)).join(", "),
                })}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: tx("common.actions"),
      enableSorting: false,
      meta: {
        headerClass: "w-[150px] min-w-[150px] max-w-[150px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[150px] min-w-[150px] max-w-[150px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={tx("common.actions")}
          actions={[
            {
              label: rtx("open"),
              icon: <IconFileText class="h-4 w-4" />,
              onSelect: () => setSelectedRun(cell.row.original),
            },
          ]}
        />
      ),
    },
  ]);

  return (
    <>
      <DataTable
        title={tx("insights.runs")}
        description={tx("insights.runsSubtitle")}
        columns={columns()}
        data={props.runs}
        empty={tx("insights.emptyRuns")}
        tableClass="insight-grid-table min-w-[980px]"
        enablePagination
        pageSize={10}
        storageKey="insight-runs"
        onRowClick={(run) => setSelectedRun(run)}
      />

      <Show keyed when={selectedRun()}>
        {(run) => (
          <section class="data-shell mt-5 space-y-4 p-5" aria-label={rtx("panelDescription", { day: run.run_day })}>
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border-line pb-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rtx("open")}</p>
                <h2 class="mt-1 text-lg font-semibold text-text-strong">{rtx("panelDescription", { day: run.run_day })}</h2>
              </div>
              <button
                type="button"
                class="rounded-lg border border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setSelectedRun(null)}
              >
                {tx("common.close")}
              </button>
            </div>
            <InsightRunReport run={run} />
          </section>
        )}
      </Show>
    </>
  );
}
