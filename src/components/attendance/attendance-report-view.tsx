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
  const combined = createMemo(() => {
    const e = props.report.events;
    const s = props.report.sessions;
    const total = e.total + s.total;
    const present = e.present + s.present;
    return {
      rate: total > 0 ? present / total : null,
      absent: e.absent + s.absent,
      excused: e.excused + s.excused,
      totalAbsence: e.absent + s.absent + e.excused + s.excused,
    };
  });
  const blocks = () => [
    { title: t("attendance.events"), counts: props.report.events, color: "bg-emerald-500" },
    { title: t("attendance.sessions"), counts: props.report.sessions, color: "bg-sky-500" },
  ];
  const columns = createMemo<ColumnDef<CourseAttendanceRow>[]>(() => [
    {
      id: "course",
      header: t("nav.courses"),
      meta: { stickyLeft: true },
      cell: (cell) => (
        <Link to="/courses/$id" params={{ id: cell.row.original.course.id }} class="block truncate font-medium hover:text-primary-text hover:underline">
          {cell.row.original.course.title}
        </Link>
      ),
    },
    ...ATTENDANCE_STATUSES.map((status, index) => ({
      id: status.value,
      header: () => <span title={t(status.detailKey)}>{compact() ? t(status.key).slice(0, 1) : t(status.key)}</span>,
      meta: { align: "right" as const, divider: index === 0 ? ("left" as const) : undefined },
      cell: (cell) => (
        <span class={cn("mono inline-flex min-w-7 justify-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums", status.class)}>
          {cell.row.original.counts[status.value]}
        </span>
      ),
    } satisfies ColumnDef<CourseAttendanceRow>)),
    {
      id: "total",
      header: () => <span>{compact() ? "Σ" : t("common.all")}</span>,
      meta: { align: "right", cellClass: "mono" },
      cell: (cell) => cell.row.original.counts.total,
    },
    {
      id: "rate",
      header: () => <span>%</span>,
      meta: { align: "right", cellClass: "mono font-semibold" },
      cell: (cell) => percent(cell.row.original.counts.rate),
    },
  ]);

  return (
    <div class="min-w-0 space-y-4">
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div class="rounded-lg border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("attendance.overallRate")}</dt>
          <dd class="mt-2 text-3xl font-semibold tabular-nums">{percent(combined().rate)}</dd>
        </div>
        <div class="rounded-lg border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("attendance.totalAbsence")}</dt>
          <dd class="mt-2 text-3xl font-semibold tabular-nums">{combined().totalAbsence}</dd>
        </div>
        <div class="rounded-lg border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("status.excused")}</dt>
          <dd class="mt-2 text-3xl font-semibold tabular-nums">{combined().excused}</dd>
        </div>
        <div class="rounded-lg border border-border bg-card p-4 shadow-xs">
          <dt class="text-xs font-medium text-muted-foreground">{t("status.absent")}</dt>
          <dd class="mt-2 text-3xl font-semibold tabular-nums">{combined().absent}</dd>
        </div>
      </dl>

      <div class={cn("grid gap-3", !compact() && "lg:grid-cols-2")}>
        <For each={blocks()}>
          {(block) => (
            <article class="rounded-lg border border-border bg-card p-4 shadow-xs">
              <header class="flex items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-medium text-muted-foreground">{block.title}</p>
                  <p class="mt-1 text-2xl font-semibold tabular-nums">{percent(block.counts.rate)}</p>
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
                      <dd class="mt-1 text-xl font-semibold tabular-nums">{block.counts[status.value]}</dd>
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

      {/* Devamsızlık is counted in *days*, not marks: two absences in one
          calendar day count once, which is what the regulation counts. */}
      <Show when={(props.report.devamsizlik ?? []).length > 0}>
        <section class="rounded-lg border border-border bg-card p-4 shadow-xs">
          <h3 class="text-base font-semibold">{t("attendance.devamsizlik")}</h3>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <For each={props.report.devamsizlik ?? []}>
              {(term) => (
                <article class="rounded-xl border border-border-line p-3">
                  <header class="flex flex-wrap items-center justify-between gap-2">
                    <p class="min-w-0 truncate text-sm font-medium">{term.name}</p>
                    <Show when={term.over_limit}>
                      <Badge variant="destructive" class="rounded-full text-[11px]">{t("attendance.overLimit")}</Badge>
                    </Show>
                  </header>
                  <dl class="mt-2 grid grid-cols-2 gap-2">
                    <div class="rounded-lg border border-border-line p-2">
                      <dt class="text-[11px] text-muted-foreground">{t("attendance.unexcusedDays")}</dt>
                      <dd class="mt-0.5 text-lg font-semibold tabular-nums">
                        {term.unexcused_days}
                        <Show when={term.limits.max_unexcused_days != null}>
                          <span class="ml-1 text-xs font-normal text-muted-foreground">/ {term.limits.max_unexcused_days}</span>
                        </Show>
                      </dd>
                    </div>
                    <div class="rounded-lg border border-border-line p-2">
                      <dt class="text-[11px] text-muted-foreground">{t("attendance.excusedDays")}</dt>
                      <dd class="mt-0.5 text-lg font-semibold tabular-nums">
                        {term.excused_days}
                        <Show when={term.limits.max_excused_days != null}>
                          <span class="ml-1 text-xs font-normal text-muted-foreground">/ {term.limits.max_excused_days}</span>
                        </Show>
                      </dd>
                    </div>
                  </dl>
                </article>
              )}
            </For>
          </div>
        </section>
      </Show>

      <section class="rounded-lg border border-border bg-card p-4 shadow-xs">
        <h3 class="text-base font-semibold">{t("attendance.courseBreakdown")}</h3>
        <div class="mt-3">
          <Show
            when={props.report.courses.length > 0}
            fallback={<DataTableEmpty class="py-8">{t("attendance.emptyCourses")}</DataTableEmpty>}
          >
            <DataTable
              class="min-w-0"
              columns={columns()}
              data={props.report.courses}
              tableClass={cn("w-full", compact() ? "text-xs" : "table-fixed sm:min-w-160")}
              enableColumnVisibility={false}
            />
          </Show>
        </div>
      </section>
    </div>
  );
}
