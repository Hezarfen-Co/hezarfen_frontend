import { For, Show, Suspense, createResource, createSignal } from "solid-js";
import { getMyStudents } from "@/api/parents";
import { getUserMarks } from "@/api/reports";
import { getUserAttendance } from "@/api/reports";
import type { PersonRef } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/page-spinner";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";
import { IconChevronRight, IconChart, IconCalendar } from "@/components/ui/icons";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";

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
        <PageHeader accent="violet" eyebrow={t("nav.myStudents")} title={t("parents.title")} description={t("parents.subtitle")} />
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
  const [activeTab, setActiveTab] = createSignal<"marks" | "attendance">("marks");

  const [marksRes] = createResource(
    () => props.student?.id,
    async (id) => getUserMarks(id)
  );

  const [attendanceRes] = createResource(
    () => props.student?.id,
    async (id) => getUserAttendance(id)
  );

  return (
    <SidePanel open={!!props.student} onOpenChange={(open) => !open && props.onClose()} title={props.student ? personLabel(props.student) : ""} description={`@${props.student?.username}`}>
      <div class="flex flex-col h-full">
        <div class="flex gap-2 border-b p-4">
          <Button variant={activeTab() === "marks" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("marks")}>
            <IconChart class="mr-2 h-4 w-4" />
            {t("nav.marks")}
          </Button>
          <Button variant={activeTab() === "attendance" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("attendance")}>
            <IconCalendar class="mr-2 h-4 w-4" />
            {t("nav.attendance")}
          </Button>
        </div>
        <div class="flex-1 overflow-auto p-4">
          <Suspense fallback={<PageSpinner />}>
            <Show when={activeTab() === "marks"}>
              <Show when={marksRes()} fallback={<PageSpinner />}>
                <MarksReportView report={marksRes()!} />
              </Show>
            </Show>
            <Show when={activeTab() === "attendance"}>
              <Show when={attendanceRes()} fallback={<PageSpinner />}>
                <AttendanceReportView report={attendanceRes()!} />
              </Show>
            </Show>
          </Suspense>
        </div>
      </div>
    </SidePanel>
  );
}
