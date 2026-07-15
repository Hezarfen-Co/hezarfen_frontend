import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { AttendanceCounts, AttendanceReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty, DataTableFrame } from "@/components/ui/data-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ATTENDANCE_STATUSES } from "@/lib/attendance-status";
import { cn } from "@/lib/cn";
import { useT } from "@/stores/preferences-context";

function percent(rate: number | null): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function customEntries(counts: AttendanceCounts) {
  return Object.entries(counts.custom ?? {}).filter(([, count]) => count > 0);
}

function CountsCard(props: { title: string; counts: AttendanceCounts; compact?: boolean }) {
  const t = useT();
  return (
    <article class={cn("space-y-3 rounded-xl border border-border/80 bg-card", props.compact ? "p-3" : "data-shell space-y-4 p-4")}>
      <div class="flex items-center justify-between gap-3">
        <h3 class={cn("font-display font-semibold", props.compact ? "text-sm" : "text-lg")}>{props.title}</h3>
        <Badge variant="secondary" class="mono rounded-full px-2.5 py-0.5 text-xs">
          {percent(props.counts.rate)}
        </Badge>
      </div>
      <dl class={cn("grid gap-2 text-sm", props.compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
        <For each={ATTENDANCE_STATUSES}>
          {(status) => (
            <StatusStat
              label={t(status.key)}
              detail={props.compact ? undefined : t(status.detailKey)}
              value={props.counts[status.value]}
              class={status.class}
              compact={props.compact}
            />
          )}
        </For>
      </dl>
      <dl class="grid grid-cols-2 gap-2 text-sm">
        <Stat label={t("common.all")} value={props.counts.total} compact={props.compact} />
        <Stat label={t("attendance.rate")} value={percent(props.counts.rate)} compact={props.compact} />
      </dl>
      <Show when={customEntries(props.counts).length > 0}>
        <div class="flex flex-wrap gap-1.5 pt-0.5">
          <For each={customEntries(props.counts)}>
            {([label, count]) => (
              <Badge variant="outline" class="rounded-full text-[11px]">
                {label}: {count}
              </Badge>
            )}
          </For>
        </div>
      </Show>
    </article>
  );
}

function Stat(props: { label: string; value: string | number; compact?: boolean }) {
  return (
    <div class={cn("rounded-xl border bg-background/60", props.compact ? "p-2.5" : "p-3")}>
      <dt class="text-[11px] text-muted-foreground">{props.label}</dt>
      <dd class={cn("mono font-semibold tabular-nums", props.compact ? "mt-0.5 text-lg" : "mt-1 text-xl")}>{props.value}</dd>
    </div>
  );
}

function StatusStat(props: { label: string; detail?: string; value: number; class: string; compact?: boolean }) {
  return (
    <div class={cn("rounded-xl border", props.class, props.compact ? "p-2.5" : "p-3")}>
      <dt class="flex items-center justify-between gap-1 text-[11px] font-semibold">
        <span class="truncate">{props.label}</span>
        <Show when={props.detail}>
          <span class="hidden truncate font-normal opacity-75 sm:inline">{props.detail}</span>
        </Show>
      </dt>
      <dd class={cn("mono font-semibold tabular-nums", props.compact ? "mt-0.5 text-xl" : "mt-1 text-2xl")}>{props.value}</dd>
    </div>
  );
}

export function AttendanceReportView(props: { report: AttendanceReport; compact?: boolean }) {
  const t = useT();
  const compact = () => props.compact === true;

  return (
    <div class={cn("min-w-0 space-y-3", !compact() && "space-y-4")}>
      <div class={cn("grid gap-3", compact() ? "grid-cols-1" : "gap-4 lg:grid-cols-2")}>
        <CountsCard title={t("attendance.events")} counts={props.report.events} compact={compact()} />
        <CountsCard title={t("attendance.sessions")} counts={props.report.sessions} compact={compact()} />
      </div>

      <section class={cn("space-y-3 rounded-xl border border-border/80 bg-card", compact() ? "p-3" : "data-shell space-y-4 p-4")}>
        <h3 class={cn("font-display font-semibold", compact() ? "text-sm" : "text-lg")}>{t("attendance.courseBreakdown")}</h3>
        <Show
          when={props.report.courses.length > 0}
          fallback={<DataTableEmpty class="py-6">{t("attendance.emptyCourses")}</DataTableEmpty>}
        >
          <DataTableFrame class="min-w-0">
            <Table class={cn("data-table w-full", compact() ? "text-xs" : "table-fixed min-w-[40rem]")}>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.courses")}</TableHead>
                  <For each={ATTENDANCE_STATUSES}>
                    {(status) => (
                      <TableHead class="text-right" title={t(status.detailKey)}>
                        {compact() ? t(status.key).slice(0, 1) : t(status.key)}
                      </TableHead>
                    )}
                  </For>
                  <TableHead class="text-right">{compact() ? "Σ" : t("common.all")}</TableHead>
                  <TableHead class="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={props.report.courses}>
                  {(block) => (
                    <TableRow>
                      <TableCell class="min-w-0 font-medium">
                        <Link to="/courses/$id" params={{ id: block.course.id }} class="block truncate hover:underline">
                          {block.course.title}
                        </Link>
                      </TableCell>
                      <For each={ATTENDANCE_STATUSES}>
                        {(status) => (
                          <TableCell class="text-right">
                            <span
                              class={cn(
                                "mono inline-flex min-w-7 justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                                status.class,
                              )}
                            >
                              {block.counts[status.value]}
                            </span>
                          </TableCell>
                        )}
                      </For>
                      <TableCell class="mono text-right">{block.counts.total}</TableCell>
                      <TableCell class="mono text-right font-semibold">{percent(block.counts.rate)}</TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </DataTableFrame>
        </Show>
      </section>
    </div>
  );
}
