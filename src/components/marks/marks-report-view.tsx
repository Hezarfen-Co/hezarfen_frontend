import { For, Show } from "solid-js";
import { Link } from "@tanstack/solid-router";
import type { MarksReport } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { examKindLabel } from "@/lib/exam-labels";
import { examWeight } from "@/lib/exam-weight";
import { useT } from "@/stores/preferences-context";

const round = (n: number) => (Math.round(n * 100) / 100).toString();

export function MarksReportView(props: { report: MarksReport }) {
  const t = useT();
  return (
    <Show
      when={props.report.courses.length > 0}
      fallback={
        <div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("marks.empty")}
        </div>
      }
    >
      <div class="space-y-4">
        <div class="surface-card flex flex-wrap items-center justify-between gap-3 p-5">
          <span class="text-sm font-medium text-muted-foreground">{t("marks.overall")}</span>
          <p class="font-display text-3xl font-semibold tabular-nums">
            {props.report.overall_average == null ? "—" : round(props.report.overall_average)}
            <Show when={props.report.overall_average != null}>
              <span class="text-base font-medium text-muted-foreground"> / 100</span>
            </Show>
          </p>
        </div>

        <For each={props.report.courses}>
          {(block) => (
            <article class="surface-card space-y-4 p-5">
              <header class="flex flex-wrap items-center justify-between gap-2">
                <h3 class="font-display text-lg font-semibold">
                  <Link to="/courses/$id" params={{ id: block.course.id }} class="hover:text-primary hover:underline">
                    {block.course.title}
                  </Link>
                </h3>
                <Badge variant="secondary" class="rounded-full px-3 py-1" title={t("marks.courseAvg")}>
                  {block.average == null ? "—" : round(block.average)}
                </Badge>
              </header>

              <Show
                when={block.results.length > 0}
                fallback={
                  <p class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    {t("exams.noResults")}
                  </p>
                }
              >
                <div class="overflow-hidden rounded-lg border border-border/70 bg-background/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("marks.exam")}</TableHead>
                        <TableHead>{t("exams.kind")}</TableHead>
                        <TableHead>{t("marks.weight")}</TableHead>
                        <TableHead>{t("marks.mark")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <For each={block.results}>
                        {(entry) => (
                          <TableRow>
                            <TableCell>
                              <Link to="/exams/$id" params={{ id: entry.exam }} class="font-medium hover:underline">
                                {entry.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" class="rounded-full capitalize">
                                {examKindLabel(entry.kind, t)}
                              </Badge>
                            </TableCell>
                            <TableCell class="tabular-nums">{examWeight(entry) ?? "—"}</TableCell>
                            <TableCell class="font-semibold tabular-nums">{entry.mark}</TableCell>
                          </TableRow>
                        )}
                      </For>
                    </TableBody>
                  </Table>
                </div>
              </Show>
            </article>
          )}
        </For>
      </div>
    </Show>
  );
}
