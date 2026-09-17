import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getUserMarks } from "@/api/reports";
import { getUserSearch } from "@/api/users";
import { ApiError, formatApiError } from "@/api/client";
import type { MarksReport, PersonRef } from "@/api/client";
import { cn } from "@/lib/cn";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 10;
const round = (n: number) => (Math.round(n * 100) / 100).toString();
// ponytail: display-only color tiers (70/40 on a 0-100 scale), not a pass/fail rule
const avgTone = (v: number) => (v >= 70 ? "text-success" : v >= 40 ? "text-warning" : "text-destructive");

export default function StudentMarksPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentMarksContent />
    </RouteGuard>
  );
}

function StudentMarksContent() {
  const t = useT();
  const [viewUser, setViewUser] = createSignal<PersonRef | null>(null);
  const [error, setError] = createSignal("");

  const [list] = createResource(
    async () => {
      try {
        setError("");
        return (await getUserSearch("", undefined, "student")).items;
      } catch (err) {
        setError(formatApiError(err));
        return [];
      }
    },
    { initialValue: [] },
  );

  // Per-student overall marks for the inline "average" column. No bulk endpoint
  // exists, so this is one getUserMarks call per listed student, bounded by cap.
  // ponytail: N+1 marks fetch, capped at 200; add a bulk /reports/marks endpoint
  // if whole-school listing is needed. Mirrors the payments roster balance fetch.
  const MARKS_FETCH_CAP = 200;
  const [marksMapRes] = createResource(
    () => {
      const ids = list().map((user) => user.id);
      return ids.length > 0 && ids.length <= MARKS_FETCH_CAP ? ids : null;
    },
    async (ids) => {
      const pairs = await Promise.all(
        ids.map(async (id) => {
          try {
            return [id, await getUserMarks(id)] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return Object.fromEntries(pairs) as Record<string, MarksReport | null>;
    },
  );
  const marksOf = (id: string) => marksMapRes()?.[id];

  const [report, { refetch: refetchReport }] = createResource(
    () => viewUser()?.id ?? null,
    async (id) => {
      if (!id) return null;
      try {
        return await getUserMarks(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(t("common.notFound"));
          return null;
        }
        setError(formatApiError(err));
        return null;
      }
    },
  );

  // The inline "average" column reads the separate marksMapRes resource, which
  // resolves AFTER this table first renders. TanStack caches cell values by the
  // data-array identity, so without a new reference the averages only appear once
  // something forces a re-derive (e.g. sorting). Track marksMapRes and hand back a
  // fresh array so the column fills in as soon as the marks load.
  const rows = () => {
    marksMapRes();
    return [...list()];
  };
  const listLoading = () => list.loading;
  const searchPerson = (person: PersonRef, query: string) =>
    matchesSearch(query, person.username, person.display_name);
  const columns = createMemo<ColumnDef<PersonRef>[]>(() => [
    {
      accessorKey: "username",
      header: t("admin.username"),
      cell: (cell) => <span class="font-medium">{cell.row.original.username}</span>,
    },
    {
      accessorKey: "display_name",
      header: t("profile.name"),
      cell: (cell) => <span class="text-muted-foreground">{cell.row.original.display_name || "—"}</span>,
    },
    {
      id: "average",
      header: t("marks.overall"),
      accessorFn: (user) => marksOf(user.id)?.overall_average ?? -1,
      meta: { align: "right" },
      cell: (cell) => {
        const rep = marksOf(cell.row.original.id);
        if (rep == null) return <span class="text-sm text-muted-foreground">—</span>;
        if (rep.overall_average == null)
          return <span class="text-sm text-muted-foreground">{rep.overall_grade ?? "—"}</span>;
        return (
          <span class={cn("mono font-semibold tabular-nums", avgTone(rep.overall_average))}>
            {round(rep.overall_average)}
            <Show when={rep.overall_grade}>{(g) => <span class="ml-1 font-medium text-muted-foreground">/ {g()}</span>}</Show>
          </span>
        );
      },
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: {
        headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
        cellClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap",
      },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            {
              label: t("common.view"),
              icon: <IconEye class="h-4 w-4" />,
              onSelect: () => {
                setError("");
                setViewUser(cell.row.original);
              },
            },
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <section class="data-shell space-y-4 p-4">
        <Show when={error() && !viewUser()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <DataTable
            title={t("nav.studentMarks")}
            description={t("marks.lookup")}
            columns={columns()}
            data={rows()}
            tableClass="min-w-xl"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            filterHint={t("search.hint.people")}
            enablePagination
            pageSize={PAGE_SIZE}
            storageKey="student-marks"
            onRowClick={(person) => {
              setError("");
              setViewUser(person);
            }}
          />
        </Show>
      </section>

      <SidePanel
        size="wide"
        open={viewUser() != null}
        onOpenChange={(open) => {
          if (!open) {
            setViewUser(null);
            setError("");
          }
        }}
        title={t("marks.forUser", { user: personLabel(viewUser()) })}
        description={t("marks.lookup")}
      >
        <div class="min-w-0 space-y-3">
          <Show when={error()}>
            <ErrorAlert message={error()} onRetry={() => void refetchReport()} />
          </Show>
          <Show when={report.loading}>
            <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={report()}>{(r) => <MarksReportView report={r()} compact />}</Show>
        </div>
      </SidePanel>
    </div>
  );
}
