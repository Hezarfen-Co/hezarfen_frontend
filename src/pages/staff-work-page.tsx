import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteWorkEntryById } from "@/api/deleteWorkEntryById";
import { getUserWorkLog } from "@/api/getUserWorkLog";
import { patchWorkEntryById } from "@/api/patchWorkEntryById";
import { formatApiError } from "@/api/client";
import type { PersonRef, WorkEntry } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { UserSearchSelect } from "@/components/users/user-search-select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableFrame } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  const [userId, setUserId] = createSignal("");
  const [selectedUser, setSelectedUser] = createSignal<PersonRef | null>(null);
  const [lookupId, setLookupId] = createSignal<string | null>(null);
  const [lookupLabel, setLookupLabel] = createSignal("");
  const [page, setPage] = createSignal(0);
  const [error, setError] = createSignal("");
  const [editTarget, setEditTarget] = createSignal<WorkEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<WorkEntry | null>(null);
  const [checkInDate, setCheckInDate] = createSignal("");
  const [checkInTime, setCheckInTime] = createSignal("");
  const [checkOutDate, setCheckOutDate] = createSignal("");
  const [checkOutTime, setCheckOutTime] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const [list, { refetch }] = createResource(
    () => (lookupId() ? `${lookupId()}|${page()}` : null),
    async (key) => {
      if (!key) return { items: [] as WorkEntry[], total: 0 };
      const id = key.split("|")[0]!;
      return loadListPage({
        page: page(),
        pageSize: WORK_PAGE_SIZE,
        clientMode: false,
        fetch: (params) => getUserWorkLog(id, params),
      });
    },
  );

  const total = () => list()?.total ?? 0;
  const pageItems = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), WORK_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));

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
      await refetch();
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
        <form
          class="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const id = userId().trim();
            if (!id) return;
            setLookupId(id);
            setLookupLabel(personLabel(selectedUser()) === "—" ? id : personLabel(selectedUser()));
            setPage(0);
          }}
        >
          <UserSearchSelect
            id="staff-work-user"
            label={t("work.teacherIdentity")}
            value={userId()}
            onChange={setUserId}
            onSelectUser={setSelectedUser}
            placeholder={t("common.searchPlaceholder")}
            selectPlaceholder={t("work.teacherIdentity")}
            emptyMessage={t("work.noTeachers")}
            allowManualValue
            role={["teacher", "manager", "admin"]}
          />
          <Button type="submit" class="h-9 w-full rounded-lg sm:w-auto">
            {t("work.show")}
          </Button>
        </form>
        <Show when={error() && !editTarget()}>
          <Alert variant="destructive">{error()}</Alert>
        </Show>
      </section>

      <Show when={lookupId()}>
        <section class="data-shell space-y-4 p-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="font-display text-lg font-semibold">{t("work.entries")}</h2>
              <p class="mt-1 text-sm text-muted-foreground">{t("work.forUser", { user: lookupLabel() || lookupId() || "" })}</p>
            </div>
            <Badge variant="secondary" class="mono rounded-sm px-3 py-1">
              {total()}
            </Badge>
          </div>
          <Suspense fallback={<PageSpinner />}>
            <Show when={list.error}>
              <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
            </Show>
            <Show
              when={pageItems().length > 0}
              fallback={<div class="rounded-lg border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">{t("work.empty")}</div>}
            >
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
                    <For each={pageItems()}>
                      {(entry) => (
                        <TableRow>
                          <TableCell class="mono">{formatDateTime(entry.check_in, locale())}</TableCell>
                          <TableCell class="mono">{formatDateTime(entry.check_out, locale())}</TableCell>
                          <TableCell class="mono">{formatDurationMinutes(entry.duration_ms, locale())}</TableCell>
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
              <Show when={total() > WORK_PAGE_SIZE}>
                <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
              </Show>
            </Show>
          </Suspense>
        </section>
      </Show>

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
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
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
            await refetch();
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
