import { Show, Suspense, createEffect, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { useNavigate, useSearch } from "@tanstack/solid-router";
import { getMyAttendance, getMyKarne, getMyMarks } from "@/api/reports";
import { getTerms } from "@/api/terms";
import { formatApiError } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { KarneView } from "@/components/marks/karne-view";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { IconChart, IconClipboardCheck, IconSchool } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useT } from "@/stores/preferences-context";

type MarksTab = "marks" | "karne" | "attendance";

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
  const [tab, setTab] = createSignal<MarksTab>(routeSearch().tab);
  createEffect(() => setTab(routeSearch().tab));
  const [marks] = createResource(() => tab() === "marks" || null, () => getMyMarks());
  const [attendance] = createResource(() => tab() === "attendance" || null, () => getMyAttendance());
  const [terms] = createResource(() => tab() === "karne" || null, async () => (await getTerms({ limit: 100 })).items);
  // "" = let the backend pick the newest dönem; the picker fills in once the
  // term list lands, so the first read is not blocked on it.
  const [karneTerm, setKarneTerm] = createSignal("");
  createEffect(() => {
    const list = terms();
    if (!list || list.length === 0 || karneTerm()) return;
    setKarneTerm(list[0].id);
  });
  const [karne] = createResource(
    () => (tab() === "karne" ? karneTerm() : null),
    (term) => getMyKarne(term || undefined),
  );

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
          const next: MarksTab = value === "attendance" ? "attendance" : value === "karne" ? "karne" : "marks";
          setTab(next);
          void navigate({ to: "/marks", search: { tab: next } });
        }}
      >
        <TabsList class="grid w-full grid-cols-3 sm:w-fit">
          <TabsTrigger value="marks" class="min-w-0">
            <IconChart class="h-4 w-4" />
            {t("nav.group.grades")}
          </TabsTrigger>
          <TabsTrigger value="karne" class="min-w-0">
            <IconSchool class="h-4 w-4" />
            {t("karne.title")}
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
        <TabsContent value="karne" class="mt-0 border-0 bg-transparent p-0 shadow-none">
          <Suspense fallback={<PageSpinner />}>
            <Show when={!karne.error} fallback={<Alert variant="destructive">{formatApiError(karne.error)}</Alert>}>
              <Show when={karne()} fallback={<EmptyState kind="exams" title={t("karne.empty")} />}>
                {(report) => (
                  <KarneView
                    report={report()}
                    terms={terms() ?? []}
                    selectedTerm={karneTerm()}
                    onTermChange={setKarneTerm}
                  />
                )}
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
