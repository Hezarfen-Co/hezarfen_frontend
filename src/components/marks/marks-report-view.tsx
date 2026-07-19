import { For, Show, createMemo, createResource } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { Link } from "@tanstack/solid-router";
import { getSettings } from "@/api/getSettings";
import type { MarksReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { ExamLink } from "@/components/exams/exam-link";
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

export function MarksReportView(props: { report: MarksReport; compact?: boolean }) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const compact = () => props.compact === true;
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
  ];

  return (
    <Show when={props.report.courses.length > 0} fallback={<DataTableEmpty>{t("marks.empty")}</DataTableEmpty>}>
      <div class={cn("space-y-3", compact() ? "min-w-0" : "space-y-4")}>
        <div
          class={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card",
            compact() ? "px-3 py-3" : "data-shell p-4",
          )}
        >
          <span class="text-xs font-medium text-muted-foreground sm:text-sm">{t("marks.overall")}</span>
          <p class={cn("font-display font-semibold tabular-nums", compact() ? "text-2xl" : "text-3xl")}>
            {markWithGrade(props.report.overall_average, props.report.overall_grade)}
            <Show when={props.report.overall_average != null}>
              <span class="text-sm font-medium text-muted-foreground"> / 100</span>
            </Show>
          </p>
        </div>

        <For each={props.report.courses}>
          {(block) => (
            <article
              class={cn(
                "space-y-3 rounded-xl border border-border/80 bg-card",
                compact() ? "p-3" : "data-shell space-y-4 p-4",
              )}
            >
              <header class="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h3 class={cn("min-w-0 font-display font-semibold", compact() ? "text-sm" : "text-lg")}>
                  <Link
                    to="/courses/$id"
                    params={{ id: block.course.id }}
                    class="block truncate hover:text-primary hover:underline"
                  >
                    {block.course.title}
                  </Link>
                </h3>
                <Badge variant="secondary" class="mono shrink-0 rounded-sm px-2.5 py-0.5 text-xs" title={t("marks.courseAvg")}>
                  {markWithGrade(block.average, block.average_grade)}
                </Badge>
              </header>

              <Show when={block.results.length > 0} fallback={<DataTableEmpty class="py-6">{t("exams.noResults")}</DataTableEmpty>}>
                <DataTable class="min-w-0" columns={columns()} data={block.results} tableClass={cn("w-full", compact() ? "text-xs" : "table-fixed min-w-[36rem]")} />
              </Show>
            </article>
          )}
        </For>
      </div>
    </Show>
  );
}
