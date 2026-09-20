import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getUserAttendance } from "@/api/reports";
import { ApiError, formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/client";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { studentDirectoryColumns } from "@/components/users/student-directory-columns";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { getStudentDirectory, type StudentDirectoryRow } from "@/lib/student-directory";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 10;

export default function StudentAttendancePage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentAttendanceContent />
    </RouteGuard>
  );
}

function StudentAttendanceContent() {
  const t = useT();
  const [viewUser, setViewUser] = createSignal<PersonRef | null>(null);
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

  const [report, { refetch: refetchReport }] = createResource(
    () => viewUser()?.id ?? null,
    async (id) => {
      if (!id) return null;
      try {
        return await getUserAttendance(id);
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

  const rows = () => list();
  const listLoading = () => list.loading;
  const searchPerson = (row: StudentDirectoryRow, query: string) =>
    matchesSearch(query, row.person.display_name, row.person.student_number, ...row.classes.map((cls) => cls.name));
  const columns = createMemo<ColumnDef<StudentDirectoryRow>[]>(() => [
    ...studentDirectoryColumns(t),
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
                setViewUser(cell.row.original.person);
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
        <Show when={error() && !viewUser()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <DataTable
            title={t("nav.studentAttendance")}
            description={t("attendance.lookup")}
            columns={columns()}
            data={rows()}
            tableClass="min-w-xl"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            filterHint={t("search.hint.people")}
            enablePagination
            pageSize={PAGE_SIZE}
            storageKey="student-attendance"
            onRowClick={(row) => {
              setError("");
              setViewUser(row.person);
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
        title={t("attendance.forUser", { user: personLabel(viewUser()) })}
        description={t("attendance.lookup")}
        bodyClass="bg-muted/20"
      >
        <div class="min-w-0 space-y-3">
          <Show when={error()}>
            <ErrorAlert message={error()} onRetry={() => void refetchReport()} />
          </Show>
          <Show when={report.loading}>
            <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={report()}>{(r) => <AttendanceReportView report={r()} compact />}</Show>
        </div>
      </SidePanel>
    </div>
  );
}
