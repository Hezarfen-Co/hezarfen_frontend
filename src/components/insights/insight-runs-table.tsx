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
  // One value per cell: the start time, the failed/skipped counts and each
  // kind of issue used to stack under a headline value, so rows grew to
  // different heights. Each now has its own column.
  const columns = createMemo<ColumnDef<InsightRun>[]>(() => [
    {
      accessorKey: "run_day",
      header: tx("insights.runDay"),
      meta: { align: "center", cellClass: "font-medium text-text-strong" },
    },
    {
      id: "started_at",
      accessorFn: (row) => row.started_at,
      header: rtx("startedAt"),
      meta: { align: "center", cellClass: "text-muted-foreground" },
      cell: (cell) => formatDateTime(cell.row.original.started_at, prefs.locale()),
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
      meta: { align: "center", cellClass: "font-medium tabular-nums" },
      cell: (cell) => `${cell.row.original.students_ok}/${cell.row.original.students_total}`,
    },
    {
      accessorKey: "students_failed",
      header: rtx("failed"),
      meta: { align: "center", cellClass: "tabular-nums" },
    },
    {
      accessorKey: "students_skipped",
      header: rtx("skipped"),
      meta: { align: "center", cellClass: "tabular-nums" },
    },
    {
      accessorKey: "rows_written",
      header: tx("insights.written"),
      meta: { align: "center", cellClass: "tabular-nums" },
    },
    {
      accessorKey: "duration_ms",
      header: tx("insights.duration"),
      meta: { align: "center" },
      cell: (cell) => <span class="tabular-nums">{formatDurationMinutes(cell.row.original.duration_ms, prefs.locale())}</span>,
    },
    {
      id: "budget",
      accessorFn: (row) => (row.budget_exceeded ? 1 : 0),
      header: rtx("budget"),
      meta: { align: "center" },
      cell: (cell) =>
        cell.row.original.budget_exceeded
          ? <Badge variant="warning" class="rounded-full">{rtx("budgetOver")}</Badge>
          : <span class="text-muted-foreground">{rtx("budgetOk")}</span>,
    },
    {
      id: "pending",
      accessorFn: (row) => row.pending_students.length,
      header: rtx("pendingColumn"),
      meta: { align: "center" },
      cell: (cell) => {
        const pending = cell.row.original.pending_students;
        return (
          <span class={cn("tabular-nums", pending.length > 0 ? "text-warning-text" : "text-muted-foreground")} title={pending.join(", ") || undefined}>
            {pending.length}
          </span>
        );
      },
    },
    {
      id: "failed_modules",
      accessorFn: (row) => row.failed_modules.map((stage) => failedStageText(prefs.locale(), stage)).join(", "),
      header: rtx("failedModulesColumn"),
      enableSorting: false,
      meta: { cellClass: "text-warning-text" },
    },
    {
      id: "actions",
      header: tx("common.actions"),
      enableSorting: false,
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "text-center",
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
        tableClass="insight-grid-table min-w-[76rem]"
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
                class="inline-flex h-10 items-center rounded-full border border-border/70 px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 touch:h-10"
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
