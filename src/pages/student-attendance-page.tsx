import { Show, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getUserAttendance } from "@/api/getUserAttendance";
import { getUsers } from "@/api/getUsers";
import { ApiError, formatApiError } from "@/api/client";
import type { PersonRef } from "@/api/types";
import { AttendanceReportView } from "@/components/attendance/attendance-report-view";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { personLabel } from "@/lib/person";
import { useT } from "@/stores/preferences-context";

const PAGE_SIZE = 12;

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

  const [list] = createResource(
    async () => {
      try {
        setError("");
        return (await getUsers()).items
          .filter((user) => user.role === "student")
          .map((user) => ({
            id: user.id,
            username: user.username,
            display_name: [user.name, user.surname].filter(Boolean).join(" ") || null,
          }));
      } catch (err) {
        setError(formatApiError(err));
        return [];
      }
    },
    { initialValue: [] },
  );

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

  const total = () => list().length;
  const rows = () => list();
  const listLoading = () => list.loading;
  const searchPerson = (person: PersonRef, query: string) =>
    [person.username, person.display_name, person.id].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase());
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
      accessorKey: "id",
      header: t("admin.id"),
      cell: (cell) => <span class="mono text-xs text-muted-foreground">{cell.row.original.id}</span>,
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-14 text-center" },
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
      <div class="space-y-2">
        <PageHeader accent="sky" eyebrow={t("nav.admin")} title={t("nav.studentAttendance")} description={t("attendance.lookup")} />
      </div>

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("nav.studentAttendance")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {rows().length} / {total()}
            </p>
          </div>
        </div>

        <Show when={error() && !viewUser()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <DataTable
            columns={columns()}
            data={rows()}
            tableClass="min-w-[36rem]"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            enablePagination
            pageSize={PAGE_SIZE}
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
