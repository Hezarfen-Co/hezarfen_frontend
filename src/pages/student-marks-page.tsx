import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getUserMarks } from "@/api/reports";
import { ApiError, formatApiError } from "@/api/client";
import type { MarksReport } from "@/api/client";
import { cn } from "@/lib/cn";
import { MarksReportView } from "@/components/marks/marks-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { FAN_OUT_LIMIT, mapConcurrent } from "@/lib/map-concurrent";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { DropdownSelect } from "@/components/ui/select";
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

// While the per-student marks load, a pulse rather than the empty-cell dash:
// "-" would claim the student has no marks. Empty values use DataTable's own
// faded "-", the same one the band column gets from its accessor.
const CellPending = () => <span class="inline-block h-3 w-8 animate-pulse rounded bg-muted align-middle" />;
const CellEmpty = () => <span class="text-muted-foreground/40">-</span>;

function StudentMarksContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [viewStudent, setViewStudent] = createSignal<StudentDirectoryRow | null>(null);
  const [error, setError] = createSignal("");
  // The roster read's own failure: shown in place of the table with a retry,
  // so a failed load does not read as "no students".
  const [listError, setListError] = createSignal("");

  const [list, { refetch: refetchList }] = createResource(async () => {
    try {
      setListError("");
      return await getStudentDirectory();
    } catch (err) {
      setListError(formatApiError(err));
      return [];
    }
  }, { initialValue: [] as StudentDirectoryRow[] });

  // The class filter Yoklamalar and Pomodorolar offer too. The directory is
  // read whole, so it narrows client-side.
  const [classFilter, setClassFilter] = createSignal("");
  const filteredList = createMemo(() => {
    const picked = classFilter();
    return picked ? list().filter((row) => row.classes.some((cls) => cls.id === picked)) : list();
  });

  // Per-student overall marks for the inline "average" column. No bulk endpoint
  // exists, so this is one getUserMarks call per listed student — at most
  // FAN_OUT_LIMIT in flight. The cap applies to the rows on screen, not the
  // school: past it the whole-school list stays blank (the header's "i" says
  // so), and picking a class fills the column for that class. Reports already
  // read are kept, so switching classes only fetches the new students.
  const marksCache = new Map<string, MarksReport | null>();
  const [marksMapRes] = createResource(
    () => {
      const ids = filteredList().map((row) => row.person.id);
      return ids.length > 0 && ids.length <= MARKS_FETCH_CAP ? ids : null;
    },
    async (ids) => {
      const missing = ids.filter((id) => !marksCache.has(id));
      await mapConcurrent(missing, FAN_OUT_LIMIT, async (id) => {
        try {
          marksCache.set(id, await getUserMarks(id));
        } catch {
          marksCache.set(id, null);
        }
      });
      return Object.fromEntries(ids.map((id) => [id, marksCache.get(id) ?? null])) as Record<string, MarksReport | null>;
    },
  );
  // A memo: the columns read it, and must not rebuild on every list refetch.
  const marksCapped = createMemo(() => !list.loading && filteredList().length > MARKS_FETCH_CAP);
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
  const classOptions = createMemo(() => {
    const seen = new Map<string, string>();
    for (const row of list()) for (const cls of row.classes) seen.set(cls.id, cls.name);
    return [...seen]
      .sort((a, b) => a[1].localeCompare(b[1], "tr", { numeric: true }))
      .map(([value, label]) => ({ value, label }));
  });
  const rows = () => {
    marksMapRes();
    return [...filteredList()];
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
        if (average == null) return marksMapRes.loading ? <CellPending /> : <CellEmpty />;
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
      cell: (cell) => <span class="tabular-nums text-muted-foreground">{marksOf(cell.row.original.person.id)?.overall_grade}</span>,
    },
    // Graded exams behind the average, counted from the same report.
    {
      id: "exams",
      header: t("marks.examCount"),
      accessorFn: (row) => examCountOf(row.person.id) ?? -1,
      meta: { align: "right" },
      cell: (cell) => {
        const count = examCountOf(cell.row.original.person.id);
        if (count == null) return marksMapRes.loading ? <CellPending /> : <CellEmpty />;
        return <span class="tabular-nums text-muted-foreground">{count}</span>;
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
        <Show when={listError()}>
          <ErrorAlert message={listError()} onRetry={() => void refetchList()} />
        </Show>

        <Show when={!listLoading() && !listError()} fallback={<Show when={!listError()}><DataTableSkeleton columns={7} rows={6} /></Show>}>
          <DataTable
            urlState
            title={t("nav.studentMarks")}
            description={t("marks.lookup")}
            columns={columns()}
            data={rows()}
            tableClass="min-w-xl"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            filterPlaceholder={t("roster.searchDirectory")}
            filterHint={t("search.hint.studentDirectory")}
            filters={
              <DropdownSelect
                labelPrefix={t("roster.class")}
                value={classFilter()}
                onChange={setClassFilter}
                options={[{ value: "", label: t("common.all") }, ...classOptions()]}
              />
            }
            filtersActive={classFilter() !== ""}
            pageResetKey={classFilter()}
            onClearFilters={() => setClassFilter("")}
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
