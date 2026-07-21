import { Show, Suspense, createResource } from "solid-js";
import { getMyAttendance } from "@/api/reports";
import { formatApiError } from "@/api/client";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { PageSpinner } from "@/components/ui/page-spinner";
import { useT } from "@/stores/preferences-context";

export default function AttendancePage() {
  return (
    <RouteGuard exactRole="student">
      <AttendanceContent />
    </RouteGuard>
  );
}

function AttendanceContent() {
  const t = useT();
  const [report] = createResource(() => getMyAttendance());

  return (
    <div class="space-y-6">
      <PageHeader accent="sky" eyebrow={t("nav.attendance")} title={t("attendance.title")} description={t("attendance.subtitle")} />
      <Suspense fallback={<PageSpinner />}>
        <Show when={report.error}>
          <Alert variant="destructive">{formatApiError(report.error)}</Alert>
        </Show>
        <Show when={report()}>{(r) => <AttendanceReportView report={r()} />}</Show>
      </Suspense>
    </div>
  );
}
