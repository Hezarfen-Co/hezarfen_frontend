import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getUserMarks } from "@/api/reports";
import { ApiError, formatApiError } from "@/api/client";
import type { MarksReport } from "@/api/client";
import { cn } from "@/lib/cn";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { studentDirectoryColumns } from "@/components/users/student-directory-columns";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { matchesSearch } from "@/lib/search-text";
import { getStudentDirectory, type StudentDirectoryRow } from "@/lib/student-directory";
import { usePreferences, useT } from "@/stores/preferences-context";
import { formatDecimal } from "@/lib/format";

const PAGE_SIZE = 10;
// ponytail: display-only color tiers (70/40 on a 0-100 scale), not a pass/fail rule
const avgTone = (v: number) => (v >= 70 ? "text-success-text" : v >= 40 ? "text-warning-text" : "text-destructive-text");

export default function StudentMarksPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentMarksContent />
    </RouteGuard>
  );
}

const MARKS_FETCH_CAP = 200;

function StudentMarksContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [viewStudent, setViewStudent] = createSignal<StudentDirectoryRow | null>(null);
  const [error, setError] = createSignal("");

  const [list] = createResource(async () => {
    try {
      setError("");
      return await getStudentDirectory();
    } catch (err) {
      setError(formatApiError(err));
      return [];
    }
  }, { initialValue: [] as StudentDirectoryRow[] });

  // Per-student overall marks for the inline "average" column. No bulk endpoint
  // exists, so this is one getUserMarks call per listed student — at most
  // FAN_OUT_LIMIT in flight, and skipped past the cap with a visible notice
  // instead of a column that silently reads "—" for everyone.
  const [marksMapRes] = createResource(
    () => {
      const ids = list().map((row) => row.person.id);
      return ids.length > 0 && ids.length <= MARKS_FETCH_CAP ? ids : null;
    },
    async (ids) => {
      const pairs = await mapConcurrent(ids, FAN_OUT_LIMIT, async (id) => {
        try {
          return [id, await getUserMarks(id)] as const;
        } catch {
          return [id, null] as const;
        }
      });
      return Object.fromEntries(pairs) as Record<string, MarksReport | null>;
    },
  );
  // A memo: the columns read it, and must not rebuild on every list refetch.
  const marksCapped = createMemo(() => !list.loading && (list() ?? []).length > MARKS_FETCH_CAP);
  const marksOf = (id: string) => marksMapRes()?.[id];
  const examCountOf = (id: string) => {
    const rep = marksOf(id);
    return rep ? rep.courses.reduce((sum, course) => sum + course.results.length, 0) : null;
  };

  const [report, { refetch: refetchReport }] = createResource(
    () => viewStudent()?.person.id ?? null,
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
  const searchPerson = (row: StudentDirectoryRow, query: string) =>
    matchesSearch(query, row.person.display_name, row.person.student_number, ...row.classes.map((cls) => cls.name));
  const columns = createMemo<ColumnDef<StudentDirectoryRow>[]>(() => [
    ...studentDirectoryColumns(t),
    {
      id: "average",
      header: t("marks.overall"),
      accessorFn: (row) => marksOf(row.person.id)?.overall_average ?? -1,
      // Room for the label, the sort arrow and the info icon on one line.
      size: 160,
      // Why the column is blank on a large school — behind the header's "i"
      // rather than a notice kept above the table.
      meta: { align: "right", headerInfo: marksCapped() ? t("marks.averageCapped", { cap: MARKS_FETCH_CAP }) : undefined },
      cell: (cell) => {
        const average = marksOf(cell.row.original.person.id)?.overall_average;
        if (average == null) return <span class="text-sm text-muted-foreground">—</span>;
        return <span class={cn("font-semibold tabular-nums", avgTone(average))}>{formatDecimal(average, locale())}</span>;
      },
    },
    // The school's grade-band label for that average — its own column, since
    // "68,19 / 3" beside the average read as a score out of 3.
    {
      id: "grade",
      header: t("marks.band"),
      accessorFn: (row) => marksOf(row.person.id)?.overall_grade ?? "",
      meta: { align: "right" },
      cell: (cell) => <span class="tabular-nums text-muted-foreground">{marksOf(cell.row.original.person.id)?.overall_grade ?? "—"}</span>,
    },
    // Graded exams behind the average, counted from the same report.
    {
      id: "exams",
      header: t("marks.examCount"),
      accessorFn: (row) => examCountOf(row.person.id) ?? -1,
      meta: { align: "right" },
      cell: (cell) => <span class="tabular-nums text-muted-foreground">{examCountOf(cell.row.original.person.id) ?? "—"}</span>,
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
                setViewStudent(cell.row.original);
              },
            },
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-6">
      <section class="space-y-4 p-0">
        <Show when={error() && !viewStudent()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={7} rows={6} />}>
          <DataTable
            urlState
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
            onRowClick={(row) => {
              setError("");
              setViewStudent(row);
            }}
          />
        </Show>
      </section>

      <SidePanel
        size="wide"
        open={viewStudent() != null}
        onOpenChange={(open) => {
          if (!open) {
            setViewStudent(null);
            setError("");
          }
        }}
        title={t("nav.studentMarks")}
      >
        <div class="min-w-0 space-y-3">
          <Show when={error()}>
            <ErrorAlert message={error()} onRetry={() => void refetchReport()} />
          </Show>
          <Show when={report.loading}>
            <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={report()?.user === viewStudent()?.person.id && viewStudent()} keyed>
            {(student) => (
              <MarksReportView
                report={report()!}
                compact
                identity={{
                  name: student.person.display_name || student.person.username,
                  studentNumber: student.person.student_number,
                  classes: student.classes.map((cls) => cls.name),
                }}
              />
            )}
          </Show>
        </div>
      </SidePanel>
    </div>
  );
}
