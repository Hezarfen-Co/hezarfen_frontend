import { Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import { getMyAttendance, getMyMarks } from "@/api/reports";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChart, IconClipboardCheck } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/stores/preferences-context";

export default function MarksPage() {
  return (
    <RouteGuard exactRole="student">
      <MarksContent />
    </RouteGuard>
  );
}

function MarksContent() {
  const t = useT();
  const navigate = useNavigate();
  const routeSearch = useSearch({ from: "/marks" });
  const [tab, setTab] = createSignal<"marks" | "attendance">(routeSearch().tab);
  createEffect(() => setTab(routeSearch().tab));
  const [marks] = createResource(() => tab() === "marks" || null, () => getMyMarks());
  const [attendance] = createResource(() => tab() === "attendance" || null, () => getMyAttendance());

  return (
    <div class="space-y-5">
      <PageHeader
        title={t("marks.title")}
        description={tab() === "marks" ? t("marks.subtitle") : t("attendance.subtitle")}
      />

      <Tabs
        class="space-y-4"
        value={tab()}
        onChange={(value) => {
          const next = value === "attendance" ? "attendance" : "marks";
          setTab(next);
          void navigate({ to: "/marks", search: { tab: next } });
        }}
      >
        <TabsList class="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="marks" class="min-w-0">
            <IconChart class="h-4 w-4" />
            {t("nav.group.grades")}
          </TabsTrigger>
          <TabsTrigger value="attendance" class="min-w-0">
            <IconClipboardCheck class="h-4 w-4" />
            {t("nav.attendance")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="marks" class="mt-0 border-0 bg-transparent p-0 shadow-none">
          <Suspense fallback={<PageSpinner />}>
            <Show when={!marks.error} fallback={<Alert variant="destructive">{formatApiError(marks.error)}</Alert>}>
              <Show when={marks()} fallback={<EmptyState kind="exams" title={t("marks.empty")} />}>
                {(report) => <MarksReportView report={report()} />}
              </Show>
            </Show>
          </Suspense>
        </TabsContent>
        <TabsContent value="attendance" class="mt-0 border-0 bg-transparent p-0 shadow-none">
          <Suspense fallback={<PageSpinner />}>
            <Show when={!attendance.error} fallback={<Alert variant="destructive">{formatApiError(attendance.error)}</Alert>}>
              <Show when={attendance()}>{(report) => <AttendanceReportView report={report()} />}</Show>
            </Show>
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
