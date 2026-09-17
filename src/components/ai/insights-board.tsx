import { Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  getInsightByUserId,
  getInsightRuns,
  getMyInsight,
  postInsightComputeByUserId,
  postInsightsRefresh,
} from "@/api/insights";
import { getMyStudents } from "@/api/parents";
import { getUserSearch } from "@/api/users";
import { formatApiError, type PersonRef, type Role } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { InsightRunsTable } from "@/components/insights/insight-runs-table";
import { RosterPersonCell } from "@/components/users/roster-person-cell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye, IconRefresh, IconSparkles } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences } from "@/stores/preferences-context";

const PAGE_SIZE = 10;

/** Every insight surface in one board: the viewer's own analysis, the student
 *  list they may browse, and the school-wide run log for managers. */
export function InsightsBoard() {
  const auth = useAuth();
  const prefs = usePreferences();
  const tx = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const role = () => auth.user()?.role;
  const canBrowseStudents = () => role() === "parent" || hasMinRole(role(), "teacher");
  const canManageRuns = () => hasMinRole(role(), "manager");
  const [selectedStudent, setSelectedStudent] = createSignal<PersonRef | null>(null);
  const [pageError, setPageError] = createSignal("");
  const [panelError, setPanelError] = createSignal("");
  const [refreshingAll, setRefreshingAll] = createSignal(false);
  const [computingStudent, setComputingStudent] = createSignal(false);
  const [, flash] = createFlash();

  const [selfInsight, { refetch: refetchSelfInsight }] = createResource(
    () => auth.user()?.id ?? null,
    async () => getMyInsight(),
  );
  const [students, { refetch: refetchStudents }] = createResource(
    () => (canBrowseStudents() ? role() : null),
    async (viewerRole: Role) =>
      viewerRole === "parent"
        ? (await getMyStudents({ limit: 200 })).items
        : (await getUserSearch("", undefined, "student", { limit: 200 })).items,
  );
  const [runs, { refetch: refetchRuns }] = createResource(
    () => (canManageRuns() ? true : null),
    async () => getInsightRuns({ limit: 100 }),
  );
  const [insight, { mutate: mutateInsight, refetch: refetchInsight }] = createResource(
    () => selectedStudent()?.id ?? null,
    async (userId) => {
      if (!userId) return null;
      setPanelError("");
      try {
        return await getInsightByUserId(userId);
      } catch (error) {
        setPanelError(formatApiError(error));
        return null;
      }
    },
  );

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

  const queueStudentCompute = async () => {
    const student = selectedStudent();
    if (!student || computingStudent()) return;
    setComputingStudent(true);
    setPanelError("");
    try {
      await postInsightComputeByUserId(student.id);
      flash(tx("insights.recomputeQueued", { student: personLabel(student) }));
    } catch (error) {
      setPanelError(formatApiError(error));
    } finally {
      setComputingStudent(false);
    }
  };

  const openStudent = (student: PersonRef) => {
    setPanelError("");
    mutateInsight(null);
    setSelectedStudent(student);
  };

  const columns = createMemo<ColumnDef<PersonRef>[]>(() => [
    {
      id: "student",
      header: tx("insights.student"),
      cell: (cell) => <RosterPersonCell person={cell.row.original} />,
    },
    {
      id: "actions",
      header: tx("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={tx("common.actions")}
          actions={[
            {
              label: tx("insights.viewAnalysis"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => openStudent(cell.row.original),
            },
          ]}
        />
      ),
    },
  ]);

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

      <Show when={canBrowseStudents()}>
        <section class="data-shell space-y-4 p-4">
          <Suspense fallback={<DataTableSkeleton columns={2} rows={8} />}>
            <Show when={students.error}>
              <ErrorAlert message={formatApiError(students.error)} onRetry={() => void refetchStudents()} />
            </Show>
            <Show when={!students.error}>
              <DataTable
                title={tx("insights.title")}
                description={role() === "parent" ? tx("insights.parentSubtitle") : tx("insights.subtitle")}
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
                columns={columns()}
                data={students() ?? []}
                empty={role() === "parent" ? tx("insights.emptyLinkedStudents") : tx("insights.emptyStudents")}
                emptyIllustration="people"
                filterPlaceholder={tx("insights.searchStudents")}
                filterHint={tx("search.hint.people")}
                searchPredicate={(student, query) => matchesSearch(query, student.display_name, student.username)}
                enablePagination
                pageSize={PAGE_SIZE}
                storageKey="insight-students"
                onRowClick={openStudent}
              />
            </Show>
          </Suspense>
        </section>
      </Show>

      <Show when={canManageRuns()}>
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
      </Show>

      <SidePanel
        size="wide"
        open={selectedStudent() != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStudent(null);
            mutateInsight(null);
            setPanelError("");
          }
        }}
        title={personLabel(selectedStudent())}
        description={tx("insights.studentAnalysis")}
      >
        <div class="space-y-4">
          <div class="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" class="rounded-lg" onClick={() => void refetchInsight()}>
              <IconRefresh class="h-4 w-4" />
              {tx("common.refresh")}
            </Button>
            <Button size="sm" class="rounded-lg" disabled={computingStudent()} onClick={() => void queueStudentCompute()}>
              <IconSparkles class="h-4 w-4" />
              {computingStudent() ? tx("insights.recomputing") : tx("insights.recompute")}
            </Button>
          </div>
          <Show when={panelError()}>
            <ErrorAlert message={panelError()} onRetry={() => void refetchInsight()} />
          </Show>
          <Show when={insight.loading && !insight()}>
            <p class="py-8 text-center text-sm text-muted-foreground">{tx("common.loading")}</p>
          </Show>
          <Show when={insight()}>{(value) => <InsightDetail insight={value()} />}</Show>
        </div>
      </SidePanel>
    </div>
  );
}
