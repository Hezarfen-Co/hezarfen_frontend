import { For, Show, createMemo } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { Link } from "@tanstack/solid-router";
import type { AttendanceCounts, AttendanceReport } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { ATTENDANCE_STATUSES } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

function percent(rate: number | null): string {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

function rateWidth(rate: number | null): string {
  return `${Math.max(0, Math.min(100, Math.round((rate ?? 0) * 100)))}%`;
}

function customEntries(counts: AttendanceCounts) {
  return Object.entries(counts.custom ?? {}).filter(([, count]) => count > 0);
}

type CourseAttendanceRow = AttendanceReport["courses"][number];

export function AttendanceReportView(props: { report: AttendanceReport; compact?: boolean }) {
  const t = useT();
  const compact = () => props.compact === true;
  const blocks = () => [
    { title: t("attendance.events"), counts: props.report.events, color: "bg-emerald-500" },
    { title: t("attendance.sessions"), counts: props.report.sessions, color: "bg-sky-500" },
  ];
  const columns = createMemo<ColumnDef<CourseAttendanceRow>[]>(() => [
    {
      id: "course",
      header: t("nav.courses"),
      cell: (cell) => (
        <Link to="/courses/$id" params={{ id: cell.row.original.course.id }} class="block truncate font-medium hover:text-primary hover:underline">
          {cell.row.original.course.title}
        </Link>
      ),
    },
    ...ATTENDANCE_STATUSES.map((status) => ({
      id: status.value,
      header: () => <span title={t(status.detailKey)}>{compact() ? t(status.key).slice(0, 1) : t(status.key)}</span>,
      meta: { headerClass: "text-right", cellClass: "text-right" },
      cell: (cell) => (
        <span class={cn("mono inline-flex min-w-7 justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", status.class)}>
          {cell.row.original.counts[status.value]}
        </span>
      ),
    } satisfies ColumnDef<CourseAttendanceRow>)),
    {
      id: "total",
      header: () => <span class="block text-right">{compact() ? "Σ" : t("common.all")}</span>,
      meta: { cellClass: "mono text-right" },
      cell: (cell) => cell.row.original.counts.total,
    },
    {
      id: "rate",
      header: () => <span class="block text-right">%</span>,
      meta: { cellClass: "mono text-right font-semibold" },
      cell: (cell) => percent(cell.row.original.counts.rate),
    },
  ]);

  return (
    <div class="min-w-0 space-y-4">
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("common.all")}</dt>
          <dd class="mt-2 font-display text-3xl font-semibold tabular-nums">
            {props.report.events.total + props.report.sessions.total}
          </dd>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("attendance.events")}</dt>
          <dd class="mt-2 font-display text-3xl font-semibold tabular-nums">{percent(props.report.events.rate)}</dd>
        </div>
        <div class="rounded-2xl border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("attendance.sessions")}</dt>
          <dd class="mt-2 font-display text-3xl font-semibold tabular-nums">{percent(props.report.sessions.rate)}</dd>
        </div>
      </dl>

      <div class={cn("grid gap-3", !compact() && "lg:grid-cols-2")}>
        <For each={blocks()}>
          {(block) => (
            <article class="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <header class="flex items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-medium text-muted-foreground">{block.title}</p>
                  <p class="mt-1 font-display text-2xl font-semibold tabular-nums">{percent(block.counts.rate)}</p>
                </div>
                <p class="text-xs text-muted-foreground">{block.counts.total} {t("common.all").toLocaleLowerCase()}</p>
              </header>
              <div class="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div class={cn("h-full rounded-full", block.color)} style={{ width: rateWidth(block.counts.rate) }} />
              </div>
              <dl class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <For each={ATTENDANCE_STATUSES}>
                  {(status) => (
                    <div class={cn("rounded-xl border p-3", status.class)}>
                      <dt class="truncate text-[11px] font-medium">{t(status.key)}</dt>
                      <dd class="mt-1 font-display text-xl font-semibold tabular-nums">{block.counts[status.value]}</dd>
                    </div>
                  )}
                </For>
              </dl>
              <Show when={customEntries(block.counts).length > 0}>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <For each={customEntries(block.counts)}>
                    {([label, count]) => <Badge variant="outline" class="rounded-full text-[11px]">{label}: {count}</Badge>}
                  </For>
                </div>
              </Show>
            </article>
          )}
        </For>
      </div>

      <section class="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <h3 class="font-display text-base font-semibold">{t("attendance.courseBreakdown")}</h3>
        <div class="mt-3">
          <Show
            when={props.report.courses.length > 0}
            fallback={<DataTableEmpty class="py-8">{t("attendance.emptyCourses")}</DataTableEmpty>}
          >
            <DataTable
              class="min-w-0"
              columns={columns()}
              data={props.report.courses}
              tableClass={cn("w-full", compact() ? "text-xs" : "table-fixed min-w-160")}
              enableColumnVisibility={false}
            />
          </Show>
        </div>
      </section>
    </div>
  );
}
