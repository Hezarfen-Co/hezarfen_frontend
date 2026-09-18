import { For, Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { Link } from "@tanstack/solid-router";
import { getSettings } from "@/api/settings";
import type { MarksReport } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { ExamLink } from "@/components/exams/exam-link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [tab, setTab] = createSignal<"general" | "byCourse">("general");
  const [activeInstanceId, setActiveInstanceId] = createSignal<string | null>(null);
  const activeCourse = createMemo(() => {
    const id = activeInstanceId();
    const courses = props.report.courses;
    return (id ? courses.find((c) => c.instance === id) : undefined) ?? courses[0];
  });
  const columns = createMemo<ColumnDef<MarkRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("marks.exam"),
      meta: { stickyLeft: true },
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
      header: t("marks.weight"),
      meta: { align: "right", divider: "left", cellClass: "mono" },
      cell: (cell) => examWeight(cell.row.original, settings()?.exam_kinds) ?? "—",
    },
    {
      accessorKey: "mark",
      header: t("marks.mark"),
      meta: { align: "right", cellClass: "mono font-semibold" },
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
        <Tabs value={tab()} onChange={(value) => setTab(value === "byCourse" ? "byCourse" : "general")}>
          <TabsList class="w-full sm:w-fit">
            <TabsTrigger value="general" class="min-w-0">{t("marks.tabGeneral")}</TabsTrigger>
            <TabsTrigger value="byCourse" class="min-w-0">{t("marks.tabByCourse")}</TabsTrigger>
          </TabsList>
        </Tabs>

        <Show when={tab() === "general"}>
          <div class="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
            <table class="w-full min-w-[28rem] table-fixed text-sm">
              <colgroup>
                <col class="w-[42%]" />
                <col class="w-[28%]" />
                <col class="w-[30%]" />
              </colgroup>
              <thead>
                <tr class="border-b border-border text-left text-xs text-muted-foreground">
                  <th class="p-3 font-medium">{t("nav.courses")}</th>
                  <th class="p-3 font-medium">{t("appointments.teacher")}</th>
                  <th class="p-3 font-medium">{t("marks.courseAvg")}</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.report.courses}>
                  {(block) => (
                    <tr class="border-b border-border/60 last:border-0">
                      <td class="min-w-0 p-3">
                        <Link to="/courses/$id" params={{ id: block.course.id }} class="block truncate font-medium hover:text-primary-text hover:underline">
                          {block.course.title}
                        </Link>
                      </td>
                      <td class="min-w-0 p-3 text-muted-foreground">
                        <Link to="/instances/$id" params={{ id: block.instance }} class="block truncate hover:text-primary-text hover:underline">
                          {t("instances.open")}
                        </Link>
                      </td>
                      <td class="min-w-0 p-3">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-12 min-w-8 shrink overflow-hidden rounded-full bg-muted">
                            <div class="h-full rounded-full bg-primary" style={{ width: scoreWidth(block.average) }} />
                          </div>
                          <span class="mono shrink-0 text-xs font-semibold tabular-nums">{markWithGrade(block.average, block.average_grade)}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>

        <Show when={tab() === "byCourse"}>
          <div class="space-y-3">
            <div class="flex flex-wrap gap-1.5">
              <For each={props.report.courses}>
                {(block) => (
                  <button
                    type="button"
                    class={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                      activeCourse()?.instance === block.instance
                        ? "border-border bg-surface-base text-foreground shadow-xs"
                        : "border-transparent text-muted-foreground hover:bg-muted/60",
                    )}
                    onClick={() => setActiveInstanceId(block.instance)}
                  >
                    {block.course.title}
                  </button>
                )}
              </For>
            </div>

            <Show when={activeCourse()} keyed>
              {(block) => (
                <div class="rounded-lg border border-border bg-card p-4 shadow-xs">
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div class="min-w-0">
                      <Link to="/courses/$id" params={{ id: block.course.id }} class="inline-flex truncate text-sm font-semibold text-primary-text hover:underline">
                        {block.course.title}
                      </Link>
                      <Link to="/instances/$id" params={{ id: block.instance }} class="mt-0.5 block truncate text-xs text-muted-foreground hover:text-primary-text hover:underline">
                        {t("instances.open")}
                      </Link>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t("marks.courseAvg")}</p>
                      <p class="mt-0.5 text-xl font-semibold tabular-nums">{markWithGrade(block.average, block.average_grade)}</p>
                    </div>
                  </div>
                  <div class="mt-3">
                    <Show when={block.results.length > 0} fallback={<DataTableEmpty class="py-6">{t("exams.noResults")}</DataTableEmpty>}>
                      <DataTable
                        class="min-w-0"
                        columns={columns()}
                        data={block.results}
                        tableClass={cn("w-full", compact() ? "text-xs" : "table-fixed sm:min-w-xl")}
                        enableColumnVisibility={false}
                      />
                    </Show>
                  </div>
                </div>
              )}
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  );
}
