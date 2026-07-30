import { For, Show, createMemo, createResource } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { Link } from "@tanstack/solid-router";
import { getSettings } from "@/api/settings";
import type { MarksReport } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { ExamLink } from "@/components/exams/exam-link";
import { IconChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { useT } from "@/stores/preferences-context";

const round = (n: number) => (Math.round(n * 100) / 100).toString();
type MarkRow = MarksReport["courses"][number]["results"][number];

function markWithGrade(mark: number | null, grade?: string | null) {
  if (mark == null) return grade ?? "—";
  return grade ? `${round(mark)} / ${grade}` : round(mark);
}

function scoreWidth(mark: number | null): string {
  return `${Math.max(0, Math.min(100, Math.round(mark ?? 0)))}%`;
}

export function MarksReportView(props: { report: MarksReport; compact?: boolean }) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const compact = () => props.compact === true;
  const resultCount = createMemo(() => props.report.courses.reduce((total, course) => total + course.results.length, 0));
  const columns = createMemo<ColumnDef<MarkRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("marks.exam"),
      cell: (cell) => (
        <span class="min-w-0">
          <ExamLink examId={cell.row.original.exam} class="block truncate font-medium hover:underline">
            {cell.row.original.title}
          </ExamLink>
          <Show when={compact()}>
            <p class="mt-0.5 truncate text-[11px] text-muted-foreground sm:hidden">
              {examKindLabel(cell.row.original.kind, t)}
            </p>
          </Show>
        </span>
      ),
    },
    {
      accessorKey: "kind",
      header: t("exams.kind"),
      meta: { headerClass: compact() ? "hidden sm:table-cell" : undefined, cellClass: compact() ? "hidden sm:table-cell" : undefined },
      cell: (cell) => <Badge variant="outline" class="rounded-sm capitalize">{examKindLabel(cell.row.original.kind, t)}</Badge>,
    },
    {
      id: "weight",
      header: () => <span class="block text-right">{t("marks.weight")}</span>,
      meta: { cellClass: "mono text-right" },
      cell: (cell) => examWeight(cell.row.original, settings()?.exam_kinds) ?? "—",
    },
    {
      accessorKey: "mark",
      header: () => <span class="block text-right">{t("marks.mark")}</span>,
      meta: { cellClass: "mono text-right font-semibold" },
      cell: (cell) => markWithGrade(cell.row.original.mark, cell.row.original.grade),
    },
  ]);

  return (
    <div class="min-w-0 space-y-4">
      <section class="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div>
          <p class="text-xs font-medium text-muted-foreground">{t("marks.overall")}</p>
          <p class={cn("mt-1 font-semibold tabular-nums", compact() ? "text-3xl" : "text-4xl")}>
            {markWithGrade(props.report.overall_average, props.report.overall_grade)}
            <Show when={props.report.overall_average != null}>
              <span class="ml-1 text-sm font-medium text-muted-foreground">/ 100</span>
            </Show>
          </p>
          <div class="mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-primary" style={{ width: scoreWidth(props.report.overall_average) }} />
          </div>
        </div>
        <dl class="grid grid-cols-2 gap-2 sm:min-w-56">
          <div class="rounded-xl bg-muted/45 p-3">
            <dt class="text-[11px] text-muted-foreground">{t("nav.courses")}</dt>
            <dd class="mt-1 text-2xl font-semibold tabular-nums">{props.report.courses.length}</dd>
          </div>
          <div class="rounded-xl bg-muted/45 p-3">
            <dt class="text-[11px] text-muted-foreground">{t("exams.results")}</dt>
            <dd class="mt-1 text-2xl font-semibold tabular-nums">{resultCount()}</dd>
          </div>
        </dl>
      </section>

      <Show when={props.report.courses.length > 0} fallback={<DataTableEmpty class="rounded-lg border border-border bg-card py-10">{t("marks.empty")}</DataTableEmpty>}>
        <div class="space-y-3">
          <For each={props.report.courses}>
            {(block) => (
              <details name="marks-courses" class="group rounded-lg border border-border bg-card shadow-xs open:ring-1 open:ring-primary/15">
                <summary class="flex min-w-0 cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg p-4 outline-hidden transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                  <div class="min-w-0 flex-1">
                    <p class={cn("truncate font-semibold", compact() ? "text-sm" : "text-lg")}>
                      {block.course.title}
                    </p>
                    <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div class="h-full rounded-full bg-primary/75" style={{ width: scoreWidth(block.average) }} />
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center gap-3">
                    <div class="text-right">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("marks.courseAvg")}</p>
                      <p class="mt-0.5 text-xl font-semibold tabular-nums">{markWithGrade(block.average, block.average_grade)}</p>
                    </div>
                    <IconChevronDown class="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div class="border-t border-border p-4 pt-3">
                  <Link
                    to="/courses/$id"
                    params={{ id: block.course.id }}
                    class="mb-3 inline-flex text-xs font-semibold text-primary hover:underline"
                  >
                    {block.course.title}
                  </Link>
                  <Show when={block.results.length > 0} fallback={<DataTableEmpty class="py-6">{t("exams.noResults")}</DataTableEmpty>}>
                    <DataTable
                      class="min-w-0"
                      columns={columns()}
                      data={block.results}
                      tableClass={cn("w-full", compact() ? "text-xs" : "table-fixed min-w-xl")}
                      enableColumnVisibility={false}
                    />
                  </Show>
                </div>
              </details>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
