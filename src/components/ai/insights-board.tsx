import { Show, Suspense, createEffect, createMemo, createSignal, on } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { getInsightRuns, getMyInsight, postInsightsRefresh } from "@/api/insights";
import { formatApiError, type Role } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { InsightOverview } from "@/components/insights/insight-overview";
import { InsightRunsTable } from "@/components/insights/insight-runs-table";
import { InsightStudentsTable } from "@/components/insights/insight-students-table";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconRefresh, IconSparkles } from "@/components/ui/icons";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createFlash } from "@/lib/flash";
import { toStudentSignal, type StudentSignal } from "@/lib/insight-run-report";
import { insightOverview, loadInsightStudents, loadStudentSignals } from "@/lib/insight-students";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences } from "@/stores/preferences-context";

/** Every insight surface in one board: the viewer's own analysis, the picture
 *  over the students they may browse (with each one's analysis in the table),
 *  and the school-wide run log for managers. A student opens as a full page. */
export function InsightsBoard() {
  const auth = useAuth();
  const prefs = usePreferences();
  const tx = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const role = () => auth.user()?.role;
  const canBrowseStudents = () => role() === "parent" || hasMinRole(role(), "teacher");
  const canManageRuns = () => hasMinRole(role(), "manager");
  const [pageError, setPageError] = createSignal("");
  const [refreshingAll, setRefreshingAll] = createSignal(false);
  const [insightTab, setInsightTab] = createSignal<"zeka" | "runs">("zeka");
  const [flashMessage, flash] = createFlash();

  const [selfInsight, { refetch: refetchSelfInsight }] = createResource(
    () => auth.user()?.id ?? null,
    async () => getMyInsight(),
  );
  const [students, { refetch: refetchStudents }] = createResource(
    () => (canBrowseStudents() ? role() : null),
    async (viewerRole: Role) => loadInsightStudents(viewerRole),
  );
  const [runs, { refetch: refetchRuns }] = createResource(
    () => (canManageRuns() ? true : null),
    async () => getInsightRuns({ limit: 100 }),
  );
  // Each student's analysis lands in its row as it is read; rows start as
  // "not loaded" so the table and the overview never show a guessed value.
  const [signals, setSignals] = createSignal<Record<string, StudentSignal>>({});
  let readGeneration = 0;
  createEffect(on(() => students.latest, (list) => {
    if (!list) return;
    const generation = ++readGeneration;
    setSignals(Object.fromEntries(list.map((person) => [person.id, toStudentSignal({ id: person.id, name: personLabel(person) }, null, null)])));
    void loadStudentSignals(list, (row) => {
      if (generation === readGeneration) setSignals((current) => ({ ...current, [row.id]: row }));
    });
  }));
  const rows = createMemo(() => Object.values(signals()));
  const overview = createMemo(() => insightOverview(rows(), students.latest?.length ?? 0));

  const refreshPage = async () => {
    setPageError("");
    try {
      const tasks: Promise<unknown>[] = [Promise.resolve(refetchSelfInsight())];
      if (canBrowseStudents()) tasks.push(Promise.resolve(refetchStudents()));
      if (canManageRuns()) tasks.push(Promise.resolve(refetchRuns()));
      await Promise.all(tasks);
    } catch (error) {
      setPageError(formatApiError(error));
    }
  };

  const queueSchoolRefresh = async () => {
    if (refreshingAll() || !canManageRuns()) return;
    setRefreshingAll(true);
    setPageError("");
    try {
      await postInsightsRefresh();
      flash(tx("insights.refreshQueued"));
      await refetchRuns();
    } catch (error) {
      setPageError(formatApiError(error));
    } finally {
      setRefreshingAll(false);
    }
  };

  const studentAnalysis = () => (
    <Show when={canBrowseStudents()}>
      <Suspense fallback={<DataTableSkeleton columns={10} rows={8} />}>
        <Show when={students.error}>
          <ErrorAlert message={formatApiError(students.error)} onRetry={() => void refetchStudents()} />
        </Show>
        <Show when={!students.error && students()}>
          <InsightOverview overview={overview()} />
          <section class="data-shell space-y-4 p-4">
            <InsightStudentsTable
              rows={rows()}
              title={tx("insights.title")}
              description={role() === "parent" ? tx("insights.parentSubtitle") : tx("insights.subtitle")}
              empty={role() === "parent" ? tx("insights.emptyLinkedStudents") : tx("insights.emptyStudents")}
              actions={
                <>
                  <Button variant="outline" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={() => void refreshPage()}>
                    <IconRefresh class="h-4 w-4" />
                    {tx("common.refresh")}
                  </Button>
                  <Show when={canManageRuns()}>
                    <Button
                      size="sm"
                      class="min-w-[7.5rem] rounded-lg"
                      disabled={refreshingAll()}
                      onClick={() => void queueSchoolRefresh()}
                    >
                      <IconSparkles class="h-4 w-4" />
                      {refreshingAll() ? tx("insights.refreshingAll") : tx("insights.refreshAll")}
                    </Button>
                  </Show>
                </>
              }
            />
          </section>
        </Show>
      </Suspense>
    </Show>
  );

  const runAnalysis = () => (
    <section class="data-shell p-4">
      <Suspense fallback={<DataTableSkeleton columns={6} rows={5} />}>
        <Show when={runs.error}>
          <ErrorAlert message={formatApiError(runs.error)} onRetry={() => void refetchRuns()} />
        </Show>
        <Show when={!runs.error}>
          <InsightRunsTable runs={runs()?.items ?? []} />
        </Show>
      </Suspense>
    </section>
  );

  return (
    <div class="space-y-5">
      <Show when={pageError()}>
        <Alert variant="destructive">{pageError()}</Alert>
      </Show>

      <Show when={role() === "student"}>
        <section class="data-shell space-y-4 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold text-text-strong">{tx("insights.myAnalysis")}</h2>
              <p class="mt-1 text-sm text-muted-foreground">{tx("insights.myAnalysisSubtitle")}</p>
            </div>
            <Button variant="outline" size="sm" class="rounded-lg" onClick={() => void refetchSelfInsight()}>
              <IconRefresh class="h-4 w-4" />
              {tx("common.refresh")}
            </Button>
          </div>
          <Suspense fallback={<p class="py-8 text-center text-sm text-muted-foreground">{tx("common.loading")}</p>}>
            <Show when={selfInsight.error}>
              <ErrorAlert message={formatApiError(selfInsight.error)} onRetry={() => void refetchSelfInsight()} />
            </Show>
            <Show when={!selfInsight.error && selfInsight()}>
              {(value) => <InsightDetail insight={value()} />}
            </Show>
          </Suspense>
        </section>
      </Show>

      <Suspense fallback={<Show when={role() === "teacher"}><p class="py-4 text-center text-sm text-muted-foreground">{tx("common.loading")}</p></Show>}>
        <Show when={role() === "teacher" && selfInsight()}>
          {(value) => (
            <section class="data-shell space-y-4 p-5">
              <div>
                <h2 class="text-base font-semibold text-text-strong">{tx("insights.myRecommendations")}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{tx("insights.myRecommendationsSubtitle")}</p>
              </div>
              <InsightDetail insight={value()} mode="cards" />
            </section>
          )}
        </Show>
      </Suspense>

      <Show when={flashMessage()}>
        <Alert variant="success">{flashMessage()}</Alert>
      </Show>

      <Show when={canManageRuns()} fallback={studentAnalysis()}>
        <Tabs value={insightTab()} onChange={(value) => setInsightTab(value as "zeka" | "runs")} class="space-y-4">
          <TabsList aria-label={tx("insights.title")}>
            <TabsTrigger value="zeka">{tx("insights.title")}</TabsTrigger>
            <TabsTrigger value="runs">{tx("insights.runs")}</TabsTrigger>
          </TabsList>
          <TabsContent value="zeka" class="mt-0 space-y-4">
            {studentAnalysis()}
          </TabsContent>
          <TabsContent value="runs" class="mt-0">
            {runAnalysis()}
          </TabsContent>
        </Tabs>
      </Show>

    </div>
  );
}
