import { createMemo } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import type { PomodoroLog, PomodoroSession } from "@/api/client";
import { DataTable } from "@/components/ui/data-table";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

/** A student's pomodoro log: lifetime focus total over the paged stint list. */
export function PomodoroLogView(props: { log: PomodoroLog }) {
  const t = useT();
  const { locale } = usePreferences();
  const columns = createMemo<ColumnDef<PomodoroSession>[]>(() => [
    {
      accessorKey: "started_at",
      header: t("pomodoro.startedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.started_at, locale())}</span>,
    },
    {
      accessorKey: "finished_at",
      header: t("pomodoro.finishedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.finished_at, locale())}</span>,
    },
    {
      accessorKey: "duration_ms",
      header: t("pomodoro.duration"),
      cell: (cell) => <span class="mono tabular-nums">{formatDurationClock(cell.row.original.duration_ms)}</span>,
    },
  ]);

  return (
    <div class="space-y-4">
      <div class="detail-metric-card">
        <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.total")}</p>
        <p class="mono mt-2 text-3xl font-semibold tabular-nums">{formatDurationClock(props.log.total_focus_ms)}</p>
      </div>
      <DataTable columns={columns()} data={props.log.items} empty={t("pomodoro.empty")} enablePagination pageSize={10} />
    </div>
  );
}
