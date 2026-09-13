import { For, Match, Show, Suspense, Switch, createEffect, createMemo, createResource, createSignal, type Component } from "solid-js";
import { useLocation, useNavigate } from "@tanstack/solid-router";
import type { ColumnDef } from "@tanstack/solid-table";
import { getClassesByUserId } from "@/api/classes";
import { getMyStudents } from "@/api/parents";
import { getPomodoroByUser } from "@/api/pomodoro";
import { getUserMarks } from "@/api/reports";
import { getUserAttendance } from "@/api/reports";
import { formatApiError, type MarksReport, type PersonRef } from "@/api/client";
import { HomeworkReportView } from "@/components/homework/homework-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableEmpty } from "@/components/ui/data-table";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { IconChart, IconChevronRight, IconClipboardCheck, IconClock, IconExam, IconExternalLink, IconHomework, IconMessage } from "@/components/ui/icons";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { PomodoroLogView } from "@/components/pomodoro/pomodoro-log-view";
import { useModules } from "@/stores/modules-context";
import { examKindLabel } from "@/lib/exam-labels";

type StudentTab = "marks" | "attendance" | "exams" | "homework" | "study";

// /students opens a child on the progress report; the parent sidebar's
// Devamsızlık / Sınav sonuçları / Çalışma planı entries are the same page
// landing on another tab (/students/attendance, /students/exams, /students/study).
function tabFromPath(pathname: string): StudentTab {
  const segment = pathname.split("/")[2];
  return segment === "attendance" || segment === "exams" || segment === "study" ? segment : "marks";
}
type CourseRow = MarksReport["courses"][number];
type ExamRow = CourseRow["results"][number] & { courseTitle: string };

function formatNumber(value: number | null) {
  if (value == null) return "—";
  return (Math.round(value * 10) / 10).toString();
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
  const location = useLocation();
  const [selectedStudent, setSelectedStudent] = createSignal<PersonRef | null>(null);
  const routeTab = () => tabFromPath(location().pathname);
  // A parent with a single linked child has nothing to pick: open that child
  // once, so a sidebar tab entry lands straight on its data.
  let autoOpened = false;
  createEffect(() => {
    const items = list();
    if (autoOpened || !items || items.length !== 1) return;
    autoOpened = true;
    setSelectedStudent(items[0]);
  });

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader eyebrow={t("nav.group.students")} title={t("nav.children")} description={t("parents.subtitle")} />
      </div>

      <Suspense fallback={<PageSpinner />}>
        <Show when={list()}>
          <Show when={list()!.length > 0} fallback={<EmptyState title={t("common.noResults")} />}>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <For each={list()}>
                {(student) => (
                  <button
                    type="button"
                    class="group flex min-w-0 items-center justify-between rounded-xl border border-border-line bg-surface-base p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface-tint"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div class="min-w-0">
                      <div class="truncate font-medium text-text-strong">{personLabel(student)}</div>
                      <div class="truncate text-sm text-text-subtle">@{student.username}</div>
                    </div>
                    <IconChevronRight class="h-5 w-5 shrink-0 text-text-subtle/70 transition-colors group-hover:text-primary" />
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Show>
      </Suspense>

      <StudentDetailPanel student={selectedStudent()} initialTab={routeTab()} onClose={() => setSelectedStudent(null)} />
    </div>
  );
}

function StudentDetailPanel(props: { student: PersonRef | null; initialTab: StudentTab; onClose: () => void }) {
  const t = useT();
  const navigate = useNavigate();
  const modules = useModules();
  const [activeTab, setActiveTab] = createSignal<StudentTab>("marks");

  const [marksRes] = createResource(
    () => props.student?.id,
    async (id) => getUserMarks(id)
  );

  const [attendanceRes] = createResource(
    () => props.student?.id,
    async (id) => getUserAttendance(id)
  );

  const [classesRes] = createResource(
    () => props.student?.id,
    async (id) => (await getClassesByUserId(id, { limit: 1 })).items,
  );
  const studentClass = () => classesRes()?.[0] ?? null;

  // Fetched only once the tab is opened: the pomodoro nest can be switched
  // off per school, and the other tabs must not pay for it.
  const [studyError, setStudyError] = createSignal("");
  const [pomodoroRes] = createResource(
    () => (activeTab() === "study" ? props.student?.id : undefined),
    async (id) => {
      setStudyError("");
      try {
        return await getPomodoroByUser(id, { limit: 50 });
      } catch (err) {
        setStudyError(formatApiError(err));
        return null;
      }
    },
  );

  createEffect(() => {
    if (props.student?.id) setActiveTab(props.initialTab);
  });

  const report = () => marksRes() ?? null;
  const courseRows = createMemo<CourseRow[]>(() => report()?.courses ?? []);
  const examRows = createMemo<ExamRow[]>(() =>
    courseRows().flatMap((course) =>
      course.results.map((result) => ({
        ...result,
        courseTitle: course.course.title,
      })),
    ),
  );

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
      header: t("marks.weight"),
      meta: { align: "right", cellClass: "mono tabular-nums" },
      cell: (cell) => cell.row.original.weight,
    },
    {
      accessorKey: "mark",
      header: t("marks.mark"),
      meta: { align: "right", cellClass: "mono font-semibold tabular-nums" },
      cell: (cell) => formatNumber(cell.row.original.mark),
    },
  ]);

  // Ordered to match the Figma per-child screen set (Gelişim raporu →
  // Devamsızlık → Sınav sonuçları); "Ödevler" has no Figma screen of its own
  // but is kept — real, working functionality with nowhere else to live.
  const tabs = createMemo<Array<{ key: StudentTab; icon: Component<{ class?: string }>; label: string }>>(() => [
    { key: "marks", icon: IconChart, label: t("nav.progressReport") },
    { key: "attendance", icon: IconClipboardCheck, label: t("nav.attendance") },
    { key: "exams", icon: IconExam, label: t("nav.childExamResults") },
    { key: "homework", icon: IconHomework, label: t("nav.homework") },
    ...(modules.isEnabled("pomodoro") ? [{ key: "study" as const, icon: IconClock, label: t("nav.childStudyPlan") }] : []),
  ]);

  return (
    <SidePanel open={!!props.student} onOpenChange={(open) => !open && props.onClose()} title={props.student ? personLabel(props.student) : ""} description={`@${props.student?.username}`}>
      <div class="flex h-full flex-col">
        <div class="border-b border-border-hairline p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            {/* A parent may read their linked students' profiles, so this is safe
                — it 403s only for someone else's child. Close the panel before
                navigating: a click that stays inside this modal never leaves it. */}
            <Show when={props.student}>
              {(s) => (
                <Button
                  variant="outline"
                  size="sm"
                  class="rounded-lg"
                  onClick={() => {
                    props.onClose();
                    void navigate({ to: "/profile/$userId", params: { userId: s().id } });
                  }}
                >
                  <IconExternalLink class="mr-2 h-4 w-4" />
                  {t("profile.viewProfile")}
                </Button>
              )}
            </Show>
            <Show when={studentClass()}>
              {(cls) => (
                <span class="min-w-0 truncate text-xs text-text-subtle">
                  {cls().name} · {t("classGroups.homeroomTeacher")}: {cls().teacher ? personLabel(cls().teacher!) : t("classGroups.noTeacher")}
                </span>
              )}
            </Show>
            <Button
              size="sm"
              class="rounded-lg"
              onClick={() => {
                props.onClose();
                void navigate({ to: "/messages" });
              }}
            >
              <IconMessage class="mr-2 h-4 w-4" />
              {t("messages.newMessage")}
            </Button>
          </div>
          <div class="flex flex-wrap gap-2">
            <For each={tabs()}>
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
              <Match when={activeTab() === "exams"}>
                <Show when={examRows().length > 0} fallback={<DataTableEmpty>{t("exams.noResults")}</DataTableEmpty>}>
                  <DataTable class="min-w-0" columns={examColumns()} data={examRows()} tableClass="w-full min-w-176 text-sm" enableSorting={false} />
                </Show>
              </Match>

              <Match when={activeTab() === "homework"}>
                <Show when={props.student?.id}>
                  {(userId) => <HomeworkReportView userId={userId()} />}
                </Show>
              </Match>

              <Match when={activeTab() === "marks"}>
                <Show when={marksRes()} fallback={<PageSpinner />}>
                  <MarksReportView report={marksRes()!} />
                </Show>
              </Match>

              <Match when={activeTab() === "study"}>
                <Show when={studyError()}>
                  <ErrorAlert message={studyError()} />
                </Show>
                <Show when={pomodoroRes()}>
                  {(log) => <PomodoroLogView log={log()} />}
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
