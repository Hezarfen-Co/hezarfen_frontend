import { For, Show, createResource } from "solid-js";
import { Link } from "@tanstack/solid-router";
import { getSettings } from "@/api/getSettings";
import type { MarksReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { DataTableEmpty, DataTableFrame } from "@/components/ui/data-table";
import { ExamLink } from "@/components/exams/exam-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { useT } from "@/stores/preferences-context";

const round = (n: number) => (Math.round(n * 100) / 100).toString();

function markWithGrade(mark: number | null, grade?: string | null) {
  if (mark == null) return grade ?? "—";
  return grade ? `${round(mark)} / ${grade}` : round(mark);
}

export function MarksReportView(props: { report: MarksReport }) {
  const t = useT();
  const [settings] = createResource(() => getSettings());
  return (
    <Show
      when={props.report.courses.length > 0}
      fallback={
          <DataTableEmpty>{t("marks.empty")}</DataTableEmpty>
      }
    >
      <div class="space-y-4">
        <div class="data-shell flex flex-wrap items-center justify-between gap-3 p-4">
          <span class="text-sm font-medium text-muted-foreground">{t("marks.overall")}</span>
          <p class="font-display text-3xl font-semibold tabular-nums">
            {markWithGrade(props.report.overall_average, props.report.overall_grade)}
            <Show when={props.report.overall_average != null}>
              <span class="text-base font-medium text-muted-foreground"> / 100</span>
            </Show>
          </p>
        </div>

        <For each={props.report.courses}>
          {(block) => (
            <article class="data-shell space-y-4 p-4">
              <header class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-display text-lg font-semibold">
                  <Link to="/courses/$id" params={{ id: block.course.id }} class="hover:text-primary hover:underline">
                    {block.course.title}
                  </Link>
                </h3>
                <Badge variant="secondary" class="mono rounded-sm px-3 py-1" title={t("marks.courseAvg")}>
                  {markWithGrade(block.average, block.average_grade)}
                </Badge>
              </header>

              <Show
                when={block.results.length > 0}
                fallback={
                  <DataTableEmpty>{t("exams.noResults")}</DataTableEmpty>
                }
              >
                <DataTableFrame>
                  <Table class="data-table table-fixed min-w-[42rem]">
                    <colgroup>
                      <col class="w-[42%]" />
                      <col class="w-[18%]" />
                      <col class="w-[8rem]" />
                      <col class="w-[10rem]" />
                    </colgroup>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("marks.exam")}</TableHead>
                        <TableHead>{t("exams.kind")}</TableHead>
                        <TableHead class="text-right">{t("marks.weight")}</TableHead>
                        <TableHead class="text-right">{t("marks.mark")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={block.results}>
                        {(entry) => (
                          <TableRow>
                            <TableCell>
                              <ExamLink examId={entry.exam} class="font-medium hover:underline">
                                {entry.title}
                              </ExamLink>
                            </TableCell>
                            <TableCell>
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
