import { Show, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { getPomodoroByUser } from "@/api/pomodoro";
import { getUserSearch } from "@/api/users";
import type { PersonRef, PomodoroSession } from "@/api/client";
import { ApiError, formatApiError } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEye } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateTime, formatDurationClock } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PAGE_SIZE = 12;

export default function StudentPomodoroPage() {
  return (
    <RouteGuard minRole="teacher">
      <StudentPomodoroContent />
    </RouteGuard>
  );
}

function StudentPomodoroContent() {
  const t = useT();
  const { locale } = usePreferences();
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

  const total = () => list().length;
  const rows = () => list();
  const listLoading = () => list.loading;
  const searchPerson = (person: PersonRef, query: string) =>
    [person.username, person.display_name, person.id].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase());
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
      accessorKey: "id",
      header: t("admin.id"),
      cell: (cell) => <span class="mono text-xs text-muted-foreground">{cell.row.original.id}</span>,
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
  const logColumns = createMemo<ColumnDef<PomodoroSession>[]>(() => [
    {
      accessorKey: "started_at",
      header: t("pomodoro.startedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.started_at, locale())}</span>,
    },
    {
      accessorKey: "finished_at",
      header: t("pomodoro.finishedAt"),
      cell: (cell) => <span class="mono whitespace-nowrap">{formatDateTime(cell.row.original.finished_at, locale())}</span>,
    },
    {
      accessorKey: "duration_ms",
      header: t("pomodoro.duration"),
      cell: (cell) => <span class="mono tabular-nums">{formatDurationClock(cell.row.original.duration_ms)}</span>,
    },
  ]);

  return (
    <div class="space-y-6">
      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
        <Show when={error() && !viewUser()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!listLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <DataTable
            title={t("nav.studentPomodoro")}
            description={`${t("pomodoro.lookup")} · ${rows().length} / ${total()}`}
            columns={studentColumns()}
            data={rows()}
            tableClass="min-w-xl"
            empty={t("form.noStudents")}
            searchPredicate={searchPerson}
            enablePagination
            pageSize={PAGE_SIZE}
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
            {(p) => (
              <div class="space-y-4">
            <div class="detail-metric-card">
              <p class="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{t("pomodoro.total")}</p>
                  <p class="mono mt-2 text-3xl font-semibold tabular-nums">{formatDurationClock(p().total_focus_ms)}</p>
            </div>
                <DataTable columns={logColumns()} data={p().items} empty={t("pomodoro.empty")} enablePagination pageSize={10} />
          </div>
            )}
          </Show>
        </div>
      </SidePanel>
    </div>
  );
}
