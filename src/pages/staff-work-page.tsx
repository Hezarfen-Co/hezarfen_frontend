import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createResponsivePageSize } from "@/lib/create-page-size";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteWorkEntryById } from "@/api/work";
import { getUserSearch } from "@/api/users";
import { getUserWorkLog } from "@/api/work";
import { patchWorkEntryById } from "@/api/work";
import { formatApiError } from "@/api/client";
import { ApiError } from "@/api/client";
import type { Page, PersonRef, WorkEntry } from "@/api/client";
import type { Locale } from "@/i18n/messages";
import { RouteGuard } from "@/components/layout/route-guard";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { createFlash } from "@/lib/flash";
import { DatePicker } from "@/components/ui/date-picker";
import { IconChevronRight, IconEdit, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/ui/table-pagination";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { matchesSearch } from "@/lib/search-text";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PEOPLE_PAGE_SIZE = 9;
const WORK_PAGE_SIZE = 15;
// Enough to cover a normal check-in/out cadence for one person; when a
// person's true total exceeds this, we know the fetched page is a partial
// log and stop deriving "latest activity" / "days this month" from it rather
// than risk a number that looks precise but silently excludes older rows the
// backend might have ordered differently than expected.
const WORK_LOG_FETCH_LIMIT = 500;

type StaffCardStats = {
  total: number;
  latest: WorkEntry | null;
  daysThisMonth: number | null;
};

function summarizeWorkLog(log: Page<WorkEntry>): StaffCardStats {
  const complete = log.total <= log.items.length;
  const latest = log.items.reduce<WorkEntry | null>((max, entry) => (!max || entry.check_in > max.check_in ? entry : max), null);
  if (!complete) return { total: log.total, latest: null, daysThisMonth: null };
  const now = new Date();
  const days = new Set(
    log.items
      .filter((entry) => {
        const d = new Date(entry.check_in);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .map((entry) => new Date(entry.check_in).toDateString()),
  );
  return { total: log.total, latest, daysThisMonth: days.size };
}
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

  const [staffSearch, setStaffSearch] = createSignal("");
  const [staffPage, setStaffPage] = createSignal(0);
  const peoplePageSize = createResponsivePageSize(PEOPLE_PAGE_SIZE);

  const entryRows = () => entries().items;
  const peopleLoading = () => people.loading;
  const searchPerson = (person: PersonRef, query: string) =>
    matchesSearch(query, person.username, person.display_name);

  const filteredPeople = createMemo(() => {
    const q = staffSearch().trim();
    return q ? people().filter((person) => searchPerson(person, q)) : people();
  });
  const staffPageCount = createMemo(() => Math.max(1, Math.ceil(filteredPeople().length / peoplePageSize())));
  const pagedPeople = createMemo(() => filteredPeople().slice(staffPage() * peoplePageSize(), (staffPage() + 1) * peoplePageSize()));
  createEffect(() => {
    staffSearch();
    peoplePageSize();
    setStaffPage(0);
  });

  // Card stats are only fetched for the staff on the visible page — the same
  // "bounded to what's on screen" shape as the payments roster balances and
  // the classes-page member counts, so paging through the whole staff list
  // never fires more than PEOPLE_PAGE_SIZE work-log requests at once.
  const [cardStats] = createResource(
    () => pagedPeople().map((person) => person.id),
    async (ids) => {
      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            return [id, summarizeWorkLog(await getUserWorkLog(id, { limit: WORK_LOG_FETCH_LIMIT }))] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return new Map(rows);
    },
  );

  const entryColumns = createMemo<ColumnDef<WorkEntry>[]>(() => [
    {
      id: "time",
      accessorFn: (row) => row.check_in,
      header: t("work.checkIn"),
      meta: { cellClass: "text-xs" },
      cell: (cell) => (
        <div class="whitespace-nowrap">
          <p>{formatDateTime(cell.row.original.check_in, locale())}</p>
          <p class="text-[11px] text-muted-foreground">→ {formatDateTime(cell.row.original.check_out, locale())}</p>
        </div>
      ),
    },
    {
      accessorKey: "duration_ms",
      header: t("work.duration"),
      meta: { cellClass: "text-xs" },
      cell: (cell) => formatDurationMinutes(cell.row.original.duration_ms, locale()),
    },
    {
      id: "status",
      header: t("work.status"),
      cell: (cell) => <Badge variant={cell.row.original.check_out == null ? "default" : "secondary"}>{cell.row.original.check_out == null ? t("work.open") : t("work.closed")}</Badge>,
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
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>

      <Show when={error() && !viewUser() && !editTarget()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <div class="space-y-3">
        <div class="rounded-xl border border-border-line bg-surface-base p-3 shadow-xs">
          <DataToolbar
            searchValue={staffSearch()}
            searchPlaceholder={t("work.searchPlaceholder")}
            searchHint={t("search.hint.people")}
            onSearchInput={setStaffSearch}
            actions={
              <>
                <Button type="button" size="sm" variant="outline" class="rounded-lg" disabled title={t("comingSoon.title")}>
                  {t("work.addEntry")}
                  <ComingSoonBadge class="ml-1.5" />
                </Button>
                <Button type="button" size="sm" variant="outline" class="rounded-lg" disabled title={t("comingSoon.title")}>
                  {t("work.planShift")}
                  <ComingSoonBadge class="ml-1.5" />
                </Button>
              </>
            }
          />
        </div>

        <div class="rounded-xl border border-border-line bg-surface-base p-3 shadow-xs sm:p-4">
          <Show when={!peopleLoading()} fallback={<DataTableSkeleton columns={3} rows={6} />}>
            <Show when={pagedPeople().length > 0} fallback={<EmptyState kind="people" title={t("work.noTeachers")} />}>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <For each={pagedPeople()}>
                  {(person) => (
                    <StaffCard
                      person={person}
                      stats={cardStats()?.get(person.id) ?? undefined}
                      locale={locale()}
                      onClick={() => {
                        setError("");
                        setViewUser(person);
                      }}
                    />
                  )}
                </For>
              </div>
              <TablePagination pageIndex={staffPage()} pageCount={staffPageCount()} onPageChange={setStaffPage} />
            </Show>
          </Show>
        </div>
      </div>

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
        <Show when={!entries.loading} fallback={<DataTableSkeleton columns={4} rows={4} />}>
          <Show
            when={entryRows().length > 0}
            fallback={<EmptyState kind="work" title={t("work.empty")} />}
          >
            <div class="space-y-3">
              <DataTable columns={entryColumns()} data={entryRows()} storageKey="staff-work-entries" enablePagination pageSize={WORK_PAGE_SIZE} />
            </div>
          </Show>
        </Show>
      </SidePanel>

      <SidePanel guardUnsaved
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
              <DatePicker id="staff-check-in-date" class="h-9" placeholder={t("form.datePlaceholder")} value={checkInDate()} required onChange={setCheckInDate} />
              <Input class="h-9 rounded-md font-mono" placeholder="09:00" value={checkInTime()} required onInput={(e) => setCheckInTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label>{t("work.checkOut")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker id="staff-check-out-date" class="h-9" placeholder={t("form.datePlaceholder")} value={checkOutDate()} required onChange={setCheckOutDate} />
              <Input class="h-9 rounded-md font-mono" placeholder="17:00" value={checkOutTime()} required onInput={(e) => setCheckOutTime(e.currentTarget.value)} />
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={pending() || !checkInDate().trim() || !checkInTime().trim() || !checkOutDate().trim() || !checkOutTime().trim()}>
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

function StaffCard(props: { person: PersonRef; stats: StaffCardStats | null | undefined; locale: Locale; onClick: () => void }) {
  const t = useT();
  const latest = () => props.stats?.latest ?? null;
  const isOpen = () => latest() != null && latest()!.check_out == null;
  const duration = () => {
    const entry = latest();
    if (!entry) return null;
    return entry.check_out == null ? Date.now() - entry.check_in : entry.duration_ms;
  };

  return (
    <button
      type="button"
      onClick={props.onClick}
      class="flex flex-col gap-3 rounded-lg border border-border-line bg-surface-base p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div class="flex items-center gap-2.5">
        <div class="min-w-0 flex-1">
          <p class="truncate text-[15px] font-semibold text-text-strong">{props.person.display_name || props.person.username}</p>
          <p class="truncate text-xs text-text-subtle">@{props.person.username}</p>
        </div>
        <Show when={isOpen()}>
          <Badge>{t("work.open")}</Badge>
        </Show>
        <IconChevronRight class="h-4 w-4 shrink-0 text-text-subtle" />
      </div>

      <Show
        when={latest()}
        fallback={<p class="text-xs text-text-subtle">{t("work.noActivity")}</p>}
      >
        {(entry) => (
          <div class="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p class="text-text-subtle">{t("work.checkIn")}</p>
              <p class="font-medium text-text-default">{formatDateTime(entry().check_in, props.locale)}</p>
            </div>
            <div>
              <p class="text-text-subtle">{t("work.checkOut")}</p>
              <p class="font-medium text-text-default">{entry().check_out == null ? "—" : formatDateTime(entry().check_out, props.locale)}</p>
            </div>
            <div>
              <p class="text-text-subtle">{t("work.duration")}</p>
              <p class="font-medium text-text-default">{duration() == null ? "—" : formatDurationMinutes(duration(), props.locale)}</p>
            </div>
          </div>
        )}
      </Show>

      <div class="border-t border-border-hairline pt-2 text-xs text-text-subtle">
        <Show
          when={props.stats?.daysThisMonth != null}
          fallback={<Show when={props.stats}>{t("work.totalEntries", { count: String(props.stats?.total ?? 0) })}</Show>}
        >
          {t("work.daysThisMonth", { count: String(props.stats?.daysThisMonth) })}
        </Show>
      </div>
    </button>
  );
}
