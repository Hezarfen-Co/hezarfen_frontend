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

function CountsCard(props: { title: string; counts: AttendanceCounts }) {
  const t = useT();
  return (
    <article class="data-shell space-y-4 p-4">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-display text-lg font-semibold">{props.title}</h3>
        <Badge variant="secondary" class="mono rounded-full px-3 py-1">{percent(props.counts.rate)}</Badge>
      </div>
      <dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <For each={ATTENDANCE_STATUSES}>
          {(status) => <StatusStat label={t(status.key)} detail={t(status.detailKey)} value={props.counts[status.value]} class={status.class} />}
        </For>
      </dl>
      <dl class="grid grid-cols-2 gap-2 text-sm">
        <Stat label={t("common.all")} value={props.counts.total} />
        <Stat label={t("attendance.rate")} value={percent(props.counts.rate)} />
      </dl>
      <Show when={customEntries(props.counts).length > 0}>
        <div class="flex flex-wrap gap-2 pt-1">
          <For each={customEntries(props.counts)}>{([label, count]) => <Badge variant="outline" class="rounded-full">{label}: {count}</Badge>}</For>
        </div>
      </Show>
    </article>
  );
}

function Stat(props: { label: string; value: string | number }) {
  return (
    <div class="rounded-xl border bg-background/60 p-3">
      <dt class="text-xs text-muted-foreground">{props.label}</dt>
      <dd class="mono mt-1 text-xl font-semibold tabular-nums">{props.value}</dd>
    </div>
  );
}

function StatusStat(props: { label: string; detail: string; value: number; class: string }) {
  return (
    <div class={cn("rounded-xl border p-3", props.class)}>
      <dt class="flex items-center justify-between gap-2 text-xs font-semibold">
        <span>{props.label}</span>
        <span class="font-normal opacity-75">{props.detail}</span>
      </dt>
      <dd class="mono mt-1 text-2xl font-semibold tabular-nums">{props.value}</dd>
    </div>
  );
}

export function AttendanceReportView(props: { report: AttendanceReport }) {
  const t = useT();
  return (
    <div class="space-y-4">
      <div class="grid gap-4 lg:grid-cols-2">
        <CountsCard title={t("attendance.events")} counts={props.report.events} />
        <CountsCard title={t("attendance.sessions")} counts={props.report.sessions} />
      </div>

      <section class="data-shell space-y-4 p-4">
        <h3 class="font-display text-lg font-semibold">{t("attendance.courseBreakdown")}</h3>
        <Show
          when={props.report.courses.length > 0}
          fallback={<DataTableEmpty>{t("attendance.emptyCourses")}</DataTableEmpty>}
        >
          <DataTableFrame>
            <Table class="data-table table-fixed min-w-[48rem]">
              <colgroup>
                <col class="w-[30%]" />
                <col class="w-[7rem]" />
                <col class="w-[7rem]" />
                <col class="w-[7rem]" />
                <col class="w-[7rem]" />
                <col class="w-[7rem]" />
                <col class="w-[7rem]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.courses")}</TableHead>
                  <For each={ATTENDANCE_STATUSES}>
                    {(status) => <TableHead class="text-right" title={t(status.detailKey)}>{t(status.key)}</TableHead>}
                  </For>
                  <TableHead class="text-right">{t("common.all")}</TableHead>
                  <TableHead class="text-right">{t("attendance.rate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={props.report.courses}>
                  {(block) => (
                    <TableRow>
                      <TableCell class="font-medium">
                        <Link to="/courses/$id" params={{ id: block.course.id }} class="hover:underline">{block.course.title}</Link>
                      </TableCell>
                      <For each={ATTENDANCE_STATUSES}>
                        {(status) => (
                          <TableCell class="text-right">
                            <span class={cn("mono inline-flex min-w-8 justify-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums", status.class)}>
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
