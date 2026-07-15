import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { AttendanceCounts, AttendanceReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <article class="surface-card space-y-3 p-5">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-display text-lg font-semibold">{props.title}</h3>
        <Badge variant="secondary" class="rounded-full px-3 py-1">{percent(props.counts.rate)}</Badge>
      </div>
      <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <Stat label={t("status.present")} value={props.counts.present} />
        <Stat label={t("status.absent")} value={props.counts.absent} />
        <Stat label={t("status.late")} value={props.counts.late} />
        <Stat label={t("status.excused")} value={props.counts.excused} />
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
    <div class="rounded-md border bg-background/60 p-3">
      <dt class="text-xs text-muted-foreground">{props.label}</dt>
      <dd class="mt-1 font-display text-xl font-semibold tabular-nums">{props.value}</dd>
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

      <section class="surface-card space-y-4 p-5">
        <h3 class="font-display text-lg font-semibold">{t("attendance.courseBreakdown")}</h3>
        <Show
          when={props.report.courses.length > 0}
          fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("attendance.emptyCourses")}</div>}
        >
          <div class="overflow-hidden rounded-lg border border-border/70 bg-background/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("nav.courses")}</TableHead>
                  <TableHead>{t("status.present")}</TableHead>
                  <TableHead>{t("status.absent")}</TableHead>
                  <TableHead>{t("status.late")}</TableHead>
                  <TableHead>{t("status.excused")}</TableHead>
                  <TableHead>{t("common.all")}</TableHead>
                  <TableHead>{t("attendance.rate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <For each={props.report.courses}>
                  {(block) => (
                    <TableRow>
                      <TableCell class="font-medium">
                        <Link to="/courses/$id" params={{ id: block.course.id }} class="hover:underline">{block.course.title}</Link>
                      </TableCell>
                      <TableCell>{block.counts.present}</TableCell>
                      <TableCell>{block.counts.absent}</TableCell>
                      <TableCell>{block.counts.late}</TableCell>
                      <TableCell>{block.counts.excused}</TableCell>
                      <TableCell>{block.counts.total}</TableCell>
                      <TableCell class="font-semibold tabular-nums">{percent(block.counts.rate)}</TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </div>
        </Show>
      </section>
    </div>
  );
}
