import { For, Match, Show, Suspense, Switch, createEffect, createMemo, createResource, createSignal, type Component } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getMyStudents } from "@/api/parents";
import { getUserMarks } from "@/api/reports";
import { getUserAttendance } from "@/api/reports";
import type { MarksReport, PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { IconBook, IconChart, IconChevronRight, IconClipboardCheck, IconExam } from "@/components/ui/icons";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { examKindLabel } from "@/lib/exam-labels";
import { cn } from "@/lib/cn";

type StudentTab = "overview" | "courses" | "exams" | "marks" | "attendance";
type CourseRow = MarksReport["courses"][number];
type ExamRow = CourseRow["results"][number] & { courseTitle: string };

function formatNumber(value: number | null) {
  if (value == null) return "—";
  return (Math.round(value * 10) / 10).toString();
}

function formatPercent(value: number | null) {
  if (value == null) return "—";
  return `${Math.round(value * 100)}%`;
}

export default function MyStudentsPage() {
  return (
    <RouteGuard exactRole="parent">
      <MyStudentsContent />
    </RouteGuard>
  );
}

function MyStudentsContent() {
  const t = useT();
  const [list] = createResource(async () => (await getMyStudents()).items);
  const [selectedStudent, setSelectedStudent] = createSignal<PersonRef | null>(null);

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader accent="violet" eyebrow={t("nav.group.students")} title={t("nav.myStudents")} description={t("parents.subtitle")} />
      </div>

      <Suspense fallback={<PageSpinner />}>
        <Show when={list()}>
          <Show when={list()!.length > 0} fallback={<EmptyState title={t("common.noResults")} />}>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <For each={list()}>
                {(student) => (
                  <button
                    type="button"
                    class="group flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div class="min-w-0">
                      <div class="truncate font-medium text-foreground">{personLabel(student)}</div>
                      <div class="truncate text-sm text-muted-foreground">@{student.username}</div>
                    </div>
                    <IconChevronRight class="h-5 w-5 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Suspense>

      <StudentDetailPanel student={selectedStudent()} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}

function StudentDetailPanel(props: { student: PersonRef | null; onClose: () => void }) {
  const t = useT();
  const [activeTab, setActiveTab] = createSignal<StudentTab>("overview");

  const [marksRes] = createResource(
    () => props.student?.id,
    async (id) => getUserMarks(id)
  );

  const [attendanceRes] = createResource(
    () => props.student?.id,
    async (id) => getUserAttendance(id)
  );

  createEffect(() => {
    if (props.student?.id) setActiveTab("overview");
  });

  const report = () => marksRes() ?? null;
  const attendance = () => attendanceRes() ?? null;
  const courseRows = createMemo<CourseRow[]>(() => report()?.courses ?? []);
  const examRows = createMemo<ExamRow[]>(() =>
    courseRows().flatMap((course) =>
      course.results.map((result) => ({
        ...result,
        courseTitle: course.course.title,
      })),
    ),
  );
  const attendanceRate = () => attendance()?.sessions.rate ?? attendance()?.events.rate ?? null;

  const examColumns = createMemo<ColumnDef<ExamRow>[]>(() => [
    {
      accessorKey: "title",
      header: t("exams.title"),
      cell: (cell) => <span class="block truncate font-medium text-foreground">{cell.row.original.title}</span>,
    },
    {
      accessorKey: "courseTitle",
      header: t("courses.title"),
      cell: (cell) => <span class="block truncate text-muted-foreground">{cell.row.original.courseTitle}</span>,
    },
    {
      accessorKey: "kind",
      header: t("exams.kind"),
      cell: (cell) => <span class="truncate">{examKindLabel(cell.row.original.kind, t)}</span>,
    },
    {
      accessorKey: "weight",
      header: () => <span class="block text-right">{t("marks.weight")}</span>,
      meta: { cellClass: "mono text-right tabular-nums" },
      cell: (cell) => cell.row.original.weight,
    },
    {
      accessorKey: "mark",
      header: () => <span class="block text-right">{t("marks.mark")}</span>,
      meta: { cellClass: "mono text-right font-semibold tabular-nums" },
      cell: (cell) => formatNumber(cell.row.original.mark),
    },
  ]);

  const tabs: Array<{ key: StudentTab; icon: Component<{ class?: string }>; label: string }> = [
    { key: "overview", icon: IconBook, label: t("dashboard.overview") },
    { key: "courses", icon: IconBook, label: t("nav.courses") },
    { key: "exams", icon: IconExam, label: t("nav.exams") },
    { key: "marks", icon: IconChart, label: t("nav.marks") },
    { key: "attendance", icon: IconClipboardCheck, label: t("nav.attendance") },
  ];

  return (
    <SidePanel open={!!props.student} onOpenChange={(open) => !open && props.onClose()} title={props.student ? personLabel(props.student) : ""} description={`@${props.student?.username}`}>
      <div class="flex h-full flex-col">
        <div class="border-b p-4">
          <div class="flex flex-wrap gap-2">
            <For each={tabs}>
              {(tab) => {
                const Icon = tab.icon;
                return (
                  <Button variant={activeTab() === tab.key ? "default" : "outline"} size="sm" onClick={() => setActiveTab(tab.key)}>
                    <Icon class="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              }}
            </For>
          </div>
        </div>

        <div class="flex-1 overflow-auto p-4">
          <Suspense fallback={<PageSpinner />}>
            <Switch>
              <Match when={activeTab() === "overview"}>
                <div class="grid gap-3 sm:grid-cols-3">
                  <article class="rounded-xl border border-border/80 bg-card p-4">
                    <p class="text-xs font-medium text-muted-foreground">{t("dashboard.stats.average")}</p>
                    <p class="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">{formatNumber(report()?.overall_average ?? null)}</p>
                  </article>
                  <article class="rounded-xl border border-border/80 bg-card p-4">
                    <p class="text-xs font-medium text-muted-foreground">{t("nav.courses")}</p>
                    <p class="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">{courseRows().length}</p>
                  </article>
                  <article class="rounded-xl border border-border/80 bg-card p-4">
                    <p class="text-xs font-medium text-muted-foreground">{t("attendance.rate")}</p>
                    <p class="mt-2 font-display text-2xl font-semibold tabular-nums text-foreground">{formatPercent(attendanceRate())}</p>
                  </article>
                </div>
              </Match>

              <Match when={activeTab() === "courses"}>
                <Show when={courseRows().length > 0} fallback={<EmptyState title={t("common.noResults")} />}>
                  <div class="space-y-3">
                    <For each={courseRows()}>
                      {(course) => (
                        <article class="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-4">
                          <div class="min-w-0">
                            <p class="truncate font-medium text-foreground">{course.course.title}</p>
                            <p class="mt-1 text-xs text-muted-foreground">
                              {course.results.length} {t("nav.exams")}
                            </p>
                          </div>
                          <Badge variant="secondary" class={cn("mono rounded-full px-2.5 py-0.5 text-xs tabular-nums", course.average == null && "opacity-70")}>
                            {formatNumber(course.average)}
                          </Badge>
                        </article>
                      )}
                    </For>
                  </div>
                </Show>
              </Match>

              <Match when={activeTab() === "exams"}>
                <Show when={examRows().length > 0} fallback={<DataTableEmpty>{t("exams.noResults")}</DataTableEmpty>}>
                  <DataTable class="min-w-0" columns={examColumns()} data={examRows()} tableClass="w-full min-w-[44rem] text-sm" enableSorting={false} />
                </Show>
              </Match>

              <Match when={activeTab() === "marks"}>
                <Show when={marksRes()} fallback={<PageSpinner />}>
                  <MarksReportView report={marksRes()!} />
                </Show>
              </Match>

              <Match when={activeTab() === "attendance"}>
                <Show when={attendanceRes()} fallback={<PageSpinner />}>
                  <AttendanceReportView report={attendanceRes()!} />
                </Show>
              </Match>
            </Switch>
          </Suspense>
        </div>
      </div>
    </SidePanel>
  );
}
