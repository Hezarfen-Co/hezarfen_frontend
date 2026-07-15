import { For, Show, createResource } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getSettings } from "@/api/getSettings";
import type { MarksReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty, DataTableFrame } from "@/components/ui/data-table";
import { ExamLink } from "@/components/exams/exam-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { useT } from "@/stores/preferences-context";

const round = (n: number) => (Math.round(n * 100) / 100).toString();

function markWithGrade(mark: number | null, grade?: string | null) {
  if (mark == null) return grade ?? "—";
  return grade ? `${round(mark)} / ${grade}` : round(mark);
}

export function MarksReportView(props: { report: MarksReport; compact?: boolean }) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  const compact = () => props.compact === true;

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
                <DataTableFrame class="min-w-0">
                  <Table class={cn("data-table w-full", compact() ? "text-xs" : "table-fixed min-w-[36rem]")}>
                    <Show when={!compact()}>
                      <colgroup>
                        <col class="w-[42%]" />
                        <col class="w-[18%]" />
                        <col class="w-[8rem]" />
                        <col class="w-[10rem]" />
                      </colgroup>
                    </Show>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("marks.exam")}</TableHead>
                        <TableHead class={compact() ? "hidden sm:table-cell" : undefined}>{t("exams.kind")}</TableHead>
                        <TableHead class="text-right">{t("marks.weight")}</TableHead>
                        <TableHead class="text-right">{t("marks.mark")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={block.results}>
                        {(entry) => (
                          <TableRow>
                            <TableCell class="min-w-0">
                              <ExamLink examId={entry.exam} class="block truncate font-medium hover:underline">
                                {entry.title}
                              </ExamLink>
                              <Show when={compact()}>
                                <p class="mt-0.5 truncate text-[11px] text-muted-foreground sm:hidden">
                                  {examKindLabel(entry.kind, t)}
                                </p>
                              </Show>
                            </TableCell>
                            <TableCell class={compact() ? "hidden sm:table-cell" : undefined}>
                              <Badge variant="outline" class="rounded-sm capitalize">
                                {examKindLabel(entry.kind, t)}
                              </Badge>
                            </TableCell>
                            <TableCell class="mono text-right">{examWeight(entry, settings()?.exam_kinds) ?? "—"}</TableCell>
                            <TableCell class="mono text-right font-semibold">{markWithGrade(entry.mark, entry.grade)}</TableCell>
                          </TableRow>
                        )}
                      </For>
                    </TableBody>
                  </Table>
                </DataTableFrame>
              </Show>
            </article>
          )}
        </For>
      </div>
    </Show>
  );
}
