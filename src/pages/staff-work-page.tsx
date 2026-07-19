import { Show, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteWorkEntryById } from "@/api/deleteWorkEntryById";
import { getUserSearch } from "@/api/getUserSearch";
import { getUserWorkLog } from "@/api/getUserWorkLog";
import { patchWorkEntryById } from "@/api/patchWorkEntryById";
import { ApiError, formatApiError } from "@/api/client";
import type { PersonRef, WorkEntry } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { createFlash } from "@/lib/flash";
import { DatePicker } from "@/components/ui/date-picker";
import { IconEdit, IconEye, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PEOPLE_PAGE_SIZE = 12;
const WORK_PAGE_SIZE = 15;
function msToDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function msToTimeInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateInputToMs(date: string, time: string): number | null {
  const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, dayRaw, monthRaw, yearRaw] = dateMatch;
  const [, hourRaw, minuteRaw] = timeMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d.getHours() !== hour || d.getMinutes() !== minute) return null;
  return d.getTime();
}

const emptyEntries = { items: [] as WorkEntry[], total: 0 };

export default function StaffWorkPage() {
  return (
    <RouteGuard minRole="manager">
      <StaffWorkContent />
    </RouteGuard>
  );
}

function StaffWorkContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [viewUser, setViewUser] = createSignal<PersonRef | null>(null);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [editTarget, setEditTarget] = createSignal<WorkEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<WorkEntry | null>(null);
  const [checkInDate, setCheckInDate] = createSignal("");
  const [checkInTime, setCheckInTime] = createSignal("");
  const [checkOutDate, setCheckOutDate] = createSignal("");
  const [checkOutTime, setCheckOutTime] = createSignal("");
  const [pending, setPending] = createSignal(false);

  // initialValue prevents Suspense remount of the page (which steals input focus).
  const [people] = createResource(
    async () => {
      try {
        return (await getUserSearch("", undefined, "teacher")).items;
      } catch (err) {
        setError(formatApiError(err));
        return [];
      }
    },
    { initialValue: [] },
  );

  const [entries, { refetch: refetchEntries }] = createResource(
    () => viewUser()?.id ?? null,
    async (id) => {
      try {
        return await getUserWorkLog(id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setError(t("work.userNotFound"));
          return emptyEntries;
        }
        setError(formatApiError(err));
        return emptyEntries;
      }
    },
    { initialValue: emptyEntries },
  );

  const peopleTotal = () => people().length;
  const peopleRows = () => people();
  const entryRows = () => entries().items;
  const peopleLoading = () => people.loading;
  const searchPerson = (person: PersonRef, query: string) =>
    [person.username, person.display_name, person.id].join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const peopleColumns = createMemo<ColumnDef<PersonRef>[]>(() => [
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
  const entryColumns = createMemo<ColumnDef<WorkEntry>[]>(() => [
    {
      accessorKey: "check_in",
      header: t("work.checkIn"),
      meta: { cellClass: "mono text-xs" },
      cell: (cell) => formatDateTime(cell.row.original.check_in, locale()),
    },
    {
      accessorKey: "check_out",
      header: t("work.checkOut"),
      meta: { cellClass: "mono text-xs" },
      cell: (cell) => formatDateTime(cell.row.original.check_out, locale()),
    },
    {
      accessorKey: "duration_ms",
      header: t("work.duration"),
      meta: { cellClass: "mono text-xs" },
      cell: (cell) => formatDurationMinutes(cell.row.original.duration_ms, locale()),
    },
    {
      id: "status",
      header: t("work.status"),
      cell: (cell) => <Badge variant={cell.row.original.check_out == null ? "default" : "secondary"} class="rounded-sm">{cell.row.original.check_out == null ? t("work.open") : t("work.closed")}</Badge>,
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
              label: t("common.edit"),
              icon: <IconEdit class="h-4 w-4" />,
              disabled: cell.row.original.check_out == null,
              onSelect: () => startEdit(cell.row.original),
            },
            {
              label: t("common.delete"),
              icon: <IconTrash class="h-4 w-4" />,
              destructive: true,
              onSelect: () => setDeleteTarget(cell.row.original),
            },
          ]}
        />
      ),
    },
  ]);

  const startEdit = (entry: WorkEntry) => {
    if (entry.check_out == null) {
      setError(t("work.cannotEditOpen"));
      return;
    }
    setError("");
    setEditTarget(entry);
    setCheckInDate(msToDateInput(entry.check_in));
    setCheckInTime(msToTimeInput(entry.check_in));
    setCheckOutDate(msToDateInput(entry.check_out));
    setCheckOutTime(msToTimeInput(entry.check_out));
  };

  const saveEdit = async (e: SubmitEvent) => {
    e.preventDefault();
    const entry = editTarget();
    if (!entry) return;
    setError("");
    const check_in = dateInputToMs(checkInDate(), checkInTime());
    const check_out = dateInputToMs(checkOutDate(), checkOutTime());
    if (check_in == null || check_out == null) {
      setError(t("work.timesRequired"));
      return;
    }
    if (check_out < check_in) {
      setError(t("form.timeOrder"));
      return;
    }
    setPending(true);
    try {
      await patchWorkEntryById(entry.id, { check_in, check_out });
      setEditTarget(null);
      await refetchEntries();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader accent="amber" eyebrow={t("nav.admin")} title={t("work.staffTitle")} description={t("work.staffSubtitle")} />
      </div>

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("work.teacherIdentity")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {peopleRows().length} / {peopleTotal()}
            </p>
          </div>
        </div>

        <Show when={error() && !viewUser() && !editTarget()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={!peopleLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <DataTable
            columns={peopleColumns()}
            data={peopleRows()}
            tableClass="min-w-[36rem]"
            empty={t("work.noTeachers")}
            searchPredicate={searchPerson}
            enablePagination
            pageSize={PEOPLE_PAGE_SIZE}
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
        title={t("work.forUser", { user: personLabel(viewUser()) })}
        description={t("work.entries")}
      >
        <Show when={error() && !editTarget()}>
          <Alert variant="destructive" class="mb-3">
            {error()}
          </Alert>
        </Show>
        <Show when={!entries.loading} fallback={<DataTableSkeleton columns={5} rows={4} />}>
          <Show
            when={entryRows().length > 0}
            fallback={<EmptyState title={t("work.empty")} />}
          >
            <div class="space-y-3">
              <DataTable columns={entryColumns()} data={entryRows()} enablePagination pageSize={WORK_PAGE_SIZE} />
            </div>
          </Show>
        </Show>
      </SidePanel>

      <SidePanel
        open={editTarget() != null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setError("");
          }
        }}
        title={t("work.correct")}
        description={t("work.correctHelp")}
      >
        <form class="space-y-4" onSubmit={saveEdit}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label>{t("work.checkIn")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker id="staff-check-in-date" class="h-10" placeholder={t("form.datePlaceholder")} value={checkInDate()} required onChange={setCheckInDate} />
              <Input class="h-10 rounded-sm font-mono" placeholder="09:00" value={checkInTime()} required onInput={(e) => setCheckInTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>{t("work.checkOut")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker id="staff-check-out-date" class="h-10" placeholder={t("form.datePlaceholder")} value={checkOutDate()} required onChange={setCheckOutDate} />
              <Input class="h-10 rounded-sm font-mono" placeholder="17:00" value={checkOutTime()} required onInput={(e) => setCheckOutTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setEditTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending() || !checkInDate().trim() || !checkInTime().trim() || !checkOutDate().trim() || !checkOutTime().trim()}>
              {t("common.update")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={t("work.deleteSummary", {
          time: deleteTarget() ? formatDateTime(deleteTarget()!.check_in, locale()) : "",
        })}
        onConfirm={async () => {
          const entry = deleteTarget();
          if (!entry) return;
          try {
            await deleteWorkEntryById(entry.id);
            await refetchEntries();
            setFlash(t("common.deleted"));
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
