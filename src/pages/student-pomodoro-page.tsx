import { Show, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { getPomodoroByUser } from "@/api/pomodoro";
import { getUserSearch } from "@/api/users";
import type { PersonRef } from "@/api/client";
import { ApiError, formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PomodoroLogView } from "@/components/pomodoro/pomodoro-log-view";
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

export default function StudentPomodoroPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentPomodoroContent />
    </RouteGuard>
  );
}

function StudentPomodoroContent() {
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

  const [log, { refetch: refetchLog }] = createResource(
    () => viewUser()?.id ?? null,
    async (id) => {
      if (!id) return null;
      try {
        return await getPomodoroByUser(id, { limit: 20 });
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
  const searchPerson = (person: PersonRef, query: string) =>
    matchesSearch(query, person.username, person.display_name);
  const studentColumns = createMemo<ColumnDef<PersonRef>[]>(() => [
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
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-28 min-w-28 text-center whitespace-nowrap" },
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

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={3} rows={6} />}>
          <DataTable
            title={t("nav.studentPomodoro")}
            description={t("pomodoro.lookup")}
            columns={studentColumns()}
            data={rows()}
            tableClass="min-w-xl"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            filterHint={t("search.hint.people")}
            enablePagination
            pageSize={PAGE_SIZE}
            storageKey="student-pomodoro"
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
        title={t("pomodoro.forUser", { user: personLabel(viewUser()) })}
        description={t("pomodoro.lookup")}
      >
        <div class="min-w-0 space-y-3">
          <Show when={error()}>
            <ErrorAlert message={error()} onRetry={() => void refetchLog()} />
          </Show>
          <Show when={log.loading}>
            <p class="text-sm text-muted-foreground">{t("common.loading")}</p>
          </Show>
          <Show when={log()}>
            {(p) => <PomodoroLogView log={p()} />}
          </Show>
        </div>
      </SidePanel>
    </div>
  );
}
