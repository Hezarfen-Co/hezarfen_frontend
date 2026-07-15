import { For, Show, createMemo, createResource, createSignal } from "solid-js";
import { deleteWorkEntryById } from "@/api/deleteWorkEntryById";
import { getUserSearch } from "@/api/getUserSearch";
import { getUserWorkLog } from "@/api/getUserWorkLog";
import { patchWorkEntryById } from "@/api/patchWorkEntryById";
import { ApiError, formatApiError } from "@/api/client";
import type { Page } from "@/api/page";
import type { PersonRef, WorkEntry } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableEmpty, DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { DatePicker } from "@/components/ui/date-picker";
import { IconEdit, IconEye, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createDebounced } from "@/lib/debounced";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

const PEOPLE_PAGE_SIZE = 12;
const WORK_PAGE_SIZE = 15;
const MIN_QUERY = 2;

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

const emptyPeople: Page<PersonRef> = { items: [], total: 0, limit: null, offset: 0 };
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
  const [query, setQuery] = createSignal("");
  const debouncedQuery = createDebounced(query, 300);
  const [page, setPage] = createSignal(0);
  const [viewUser, setViewUser] = createSignal<PersonRef | null>(null);
  const [entryPage, setEntryPage] = createSignal(0);
  const [error, setError] = createSignal("");
  const [editTarget, setEditTarget] = createSignal<WorkEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<WorkEntry | null>(null);
  const [checkInDate, setCheckInDate] = createSignal("");
  const [checkInTime, setCheckInTime] = createSignal("");
  const [checkOutDate, setCheckOutDate] = createSignal("");
  const [checkOutTime, setCheckOutTime] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const searchKey = createMemo(() => {
    const q = debouncedQuery().trim();
    if (q.length < MIN_QUERY) return null;
    return `${q}|${page()}`;
  });

  // initialValue prevents Suspense remount of the page (which steals input focus).
  const [people] = createResource(
    searchKey,
    async (key) => {
      try {
        const q = key.split("|")[0]!;
        return await getUserSearch(q, undefined, "teacher", {
          limit: PEOPLE_PAGE_SIZE,
          offset: page() * PEOPLE_PAGE_SIZE,
        });
      } catch (err) {
        setError(formatApiError(err));
        return emptyPeople;
      }
    },
    { initialValue: emptyPeople },
  );

  const [entries, { refetch: refetchEntries }] = createResource(
    () => {
      const user = viewUser();
      if (!user) return null;
      return `${user.id}|${entryPage()}`;
    },
    async (key) => {
      try {
        const id = key.split("|")[0]!;
        return await loadListPage({
          page: entryPage(),
          pageSize: WORK_PAGE_SIZE,
          clientMode: false,
          fetch: (params) => getUserWorkLog(id, params),
        });
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

  const peopleTotal = () => people().total;
  const peopleRows = () => people().items;
  const peoplePages = createMemo(() => pagesOf(peopleTotal(), PEOPLE_PAGE_SIZE));
  const safePeoplePage = createMemo(() => Math.min(page(), peoplePages() - 1));

  const entryTotal = () => entries().total;
  const entryRows = () => entries().items;
  const entryPages = createMemo(() => pagesOf(entryTotal(), WORK_PAGE_SIZE));
  const safeEntryPage = createMemo(() => Math.min(entryPage(), entryPages() - 1));

  const canSearch = () => debouncedQuery().trim().length >= MIN_QUERY;
  const hasPeople = () => peopleRows().length > 0;
  const peopleLoading = () => canSearch() && people.loading;

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
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.admin")}</span>
          <span>/</span>
          <span>{t("nav.staffWork")}</span>
        </div>
        <PageHeader accent="amber" eyebrow={t("nav.admin")} title={t("work.staffTitle")} description={t("work.staffSubtitle")} />
      </div>

      <section class="data-shell space-y-4 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-display text-lg font-semibold">{t("work.teacherIdentity")}</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              {canSearch() ? `${peopleRows().length} / ${peopleTotal()}` : t("lookup.searchHint")}
            </p>
          </div>
        </div>

        <DataToolbar
          searchValue={query()}
          searchPlaceholder={t("common.searchPlaceholder")}
          onSearchInput={(value) => {
            setError("");
            setQuery(value);
            setPage(0);
          }}
        />

        <Show when={error() && !viewUser() && !editTarget()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>

        <Show when={canSearch()} fallback={<DataTableEmpty>{t("lookup.searchHint")}</DataTableEmpty>}>
          <Show when={!peopleLoading()} fallback={<DataTableSkeleton columns={4} rows={6} />}>
            <Show when={hasPeople()} fallback={<DataTableEmpty>{t("work.noTeachers")}</DataTableEmpty>}>
              <DataTableFrame>
                <Table class="data-table min-w-[36rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("admin.username")}</TableHead>
                      <TableHead>{t("profile.name")}</TableHead>
                      <TableHead>{t("admin.id")}</TableHead>
                      <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={peopleRows()}>
                      {(user) => (
                        <TableRow>
                          <TableCell class="font-medium">{user.username}</TableCell>
                          <TableCell class="text-muted-foreground">{user.display_name || "—"}</TableCell>
                          <TableCell class="mono text-xs text-muted-foreground">{user.id}</TableCell>
                          <TableCell>
                            <TableRowActions
                              label={t("common.actions")}
                              actions={[
                                {
                                  label: t("common.view"),
                                  icon: <IconEye class="h-4 w-4" />,
                                  onSelect: () => {
                                    setError("");
                                    setEntryPage(0);
                                    setViewUser(user);
                                  },
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </DataTableFrame>
              <Show when={peopleTotal() > PEOPLE_PAGE_SIZE}>
                <PaginationControls page={safePeoplePage()} totalPages={peoplePages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Show>
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
            fallback={<div class="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{t("work.empty")}</div>}
          >
            <div class="space-y-3">
              <DataTableFrame>
                <Table class="data-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("work.checkIn")}</TableHead>
                      <TableHead>{t("work.checkOut")}</TableHead>
                      <TableHead>{t("work.duration")}</TableHead>
                      <TableHead>{t("work.status")}</TableHead>
                      <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <For each={entryRows()}>
                      {(entry) => (
                        <TableRow>
                          <TableCell class="mono text-xs">{formatDateTime(entry.check_in, locale())}</TableCell>
                          <TableCell class="mono text-xs">{formatDateTime(entry.check_out, locale())}</TableCell>
                          <TableCell class="mono text-xs">{formatDurationMinutes(entry.duration_ms, locale())}</TableCell>
                          <TableCell>
                            <Badge variant={entry.check_out == null ? "default" : "secondary"} class="rounded-sm">
                              {entry.check_out == null ? t("work.open") : t("work.closed")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TableRowActions
                              label={t("common.actions")}
                              actions={[
                                {
                                  label: t("common.edit"),
                                  icon: <IconEdit class="h-4 w-4" />,
                                  disabled: entry.check_out == null,
                                  onSelect: () => startEdit(entry),
                                },
                                {
                                  label: t("common.delete"),
                                  icon: <IconTrash class="h-4 w-4" />,
                                  destructive: true,
                                  onSelect: () => setDeleteTarget(entry),
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  </TableBody>
                </Table>
              </DataTableFrame>
              <Show when={entryTotal() > WORK_PAGE_SIZE}>
                <PaginationControls page={safeEntryPage()} totalPages={entryPages()} onPageChange={setEntryPage} />
              </Show>
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
