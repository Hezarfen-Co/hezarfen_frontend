import { Show, Suspense, createResource } from "solid-js";
import { getMyMarks } from "@/api/getMyMarks";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSpinner } from "@/components/ui/page-spinner";
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
  const [mine] = createResource(() => getMyMarks());

  return (
    <div class="space-y-6">
      <PageHeader
        accent="amber"
        eyebrow={t("nav.marks")}
        title={t("marks.title")}
        description={t("marks.subtitle")}
      />

      <Suspense fallback={<PageSpinner />}>
        <Show when={mine.error}>
          <Alert variant="destructive">{formatApiError(mine.error)}</Alert>
        </Show>
        <Show when={mine()} fallback={<EmptyState title={t("marks.empty")} />}>
          {(report) => <MarksReportView report={report()} />}
        </Show>
      </Suspense>
    </div>
  );
}
