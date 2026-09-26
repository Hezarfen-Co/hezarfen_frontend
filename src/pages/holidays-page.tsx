import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteHolidayById, getHolidays, patchHolidayById, postHoliday } from "@/api/holidays";
import { getLimits } from "@/api/limits";
import { formatApiError, type Holiday } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { dateInputFromMs, dateInputToEndOfDayMs, dateTimeInputToMs } from "@/lib/datetime-input";
import { createFlash } from "@/lib/flash";
import { formatDate } from "@/lib/format";
import { holidayKindLabel } from "@/lib/holiday-kind";
import { matchesSearch } from "@/lib/search-text";
import { usePreferences, useT } from "@/stores/preferences-context";

const DAY_MS = 86_400_000;

export default function HolidaysPage() {
  return (
    <RouteGuard minRole="manager">
      <HolidaysContent />
    </RouteGuard>
  );
}

function HolidaysContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [list, { refetch }] = createResource(async () => (await getHolidays()).items);
  const [limits] = createResource(() => getLimits());
  const kinds = () => limits.latest?.holiday.kinds ?? ["resmi", "dini", "idari", "ara"];

  const [panelOpen, setPanelOpen] = createSignal(false);
  const [editing, setEditing] = createSignal<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Holiday | null>(null);
  const [name, setName] = createSignal("");
  const [kind, setKind] = createSignal("");
  const [firstDay, setFirstDay] = createSignal("");
  const [lastDay, setLastDay] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [flash, setFlash] = createFlash();

  const openForm = (holiday: Holiday | null) => {
    setEditing(holiday);
    setName(holiday?.name ?? "");
    setKind(holiday?.kind ?? kinds()[0] ?? "");
    setFirstDay(holiday ? dateInputFromMs(holiday.starts_at) : "");
    setLastDay(holiday ? dateInputFromMs(holiday.ends_at) : "");
    setError("");
    setPanelOpen(true);
  };

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!name().trim()) {
      setError(t("form.fieldRequired"));
      return;
    }
    // A holiday blocks whole school days: the first day from midnight, the
    // last day through its final minute.
    const starts_at = dateTimeInputToMs(firstDay(), "00:00");
    const ends_at = dateInputToEndOfDayMs(lastDay());
    if (starts_at === null || ends_at === null || ends_at < starts_at) {
      setError(t("holidays.rangeInvalid"));
      return;
    }
    const body = { name: name().trim(), kind: kind(), starts_at, ends_at };
    setError("");
    setPending(true);
    try {
      const current = editing();
      if (current) await patchHolidayById(current.id, body);
      else await postHoliday(body);
      setPanelOpen(false);
      setFlash(current ? t("common.saved") : t("common.created"));
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const dayCount = (holiday: Holiday) => Math.max(1, Math.round((holiday.ends_at - holiday.starts_at) / DAY_MS));
  const rangeText = (holiday: Holiday) => {
    const first = formatDate(holiday.starts_at, locale());
    const last = formatDate(holiday.ends_at, locale());
    return first === last ? first : `${first} – ${last}`;
  };

  const columns = createMemo<ColumnDef<Holiday>[]>(() => [
    {
      accessorKey: "name",
      header: t("holidays.name"),
      meta: { cellClass: "font-medium" },
    },
    {
      id: "kind",
      accessorFn: (row) => holidayKindLabel(row.kind, t),
      header: t("holidays.kind"),
      cell: (cell) => <Badge variant="outline" class="rounded-md">{holidayKindLabel(cell.row.original.kind, t)}</Badge>,
    },
    {
      id: "range",
      accessorFn: (row) => row.starts_at,
      header: t("holidays.range"),
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => rangeText(cell.row.original),
    },
    {
      id: "days",
      accessorFn: (row) => dayCount(row),
      header: t("holidays.dayCount"),
      meta: { cellClass: "tabular-nums whitespace-nowrap" },
      cell: (cell) => t("holidays.days", { count: String(dayCount(cell.row.original)) }),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => (
        <TableRowActions
          label={t("common.actions")}
          actions={[
            { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => openForm(cell.row.original) },
            { label: t("holidays.delete"), icon: <IconTrash class="h-4 w-4" />, destructive: true, onSelect: () => setDeleteTarget(cell.row.original) },
          ]}
        />
      ),
    },
  ]);

  return (
    <div class="space-y-5">
      <Show when={flash()}><Alert variant="success">{flash()}</Alert></Show>
      <Show when={error() && !panelOpen()}><Alert variant="destructive">{error()}</Alert></Show>

      <section class="space-y-4">
        <Suspense fallback={<DataTableSkeleton columns={5} rows={6} />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <DataTable
            urlState
            title={t("holidays.title")}
            description={t("holidays.subtitle")}
            actions={
              <Button type="button" size="sm" class="min-w-[7.5rem]" onClick={() => openForm(null)}>
                <IconPlus class="h-4 w-4" />
                {t("holidays.new")}
              </Button>
            }
            columns={columns()}
            data={list.latest ?? []}
            searchPredicate={(holiday, needle) => matchesSearch(needle, holiday.name, holidayKindLabel(holiday.kind, t))}
            filterPlaceholder={t("common.searchPlaceholder")}
            filterHint={t("search.hint.holidays")}
            enablePagination
            pageSize={20}
            storageKey="holidays"
            empty={t("holidays.empty")}
            onRowClick={(holiday) => openForm(holiday)}
          />
        </Suspense>
      </section>

      <SidePanel guardUnsaved open={panelOpen()} onOpenChange={setPanelOpen} title={editing() ? t("holidays.edit") : t("holidays.new")} description={t("holidays.subtitle")}>
        <form class="space-y-4" noValidate onSubmit={save}>
          <div class="space-y-1.5">
            <Label for="holiday-name">{t("holidays.name")}<span class="ml-0.5 text-destructive-text">*</span></Label>
            <Input id="holiday-name" maxlength={limits.latest?.holiday.max_name_len} placeholder="29 Ekim Cumhuriyet Bayramı" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="holiday-kind">{t("holidays.kind")}</Label>
            <Select id="holiday-kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value)}>
              <For each={kinds()}>{(k) => <option value={k}>{holidayKindLabel(k, t)}</option>}</For>
            </Select>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="space-y-1.5">
              <Label for="holiday-first">{t("holidays.firstDay")}</Label>
              <DatePicker id="holiday-first" placeholder={t("form.datePlaceholder")} value={firstDay()} onChange={(value) => { setFirstDay(value); if (!lastDay()) setLastDay(value); }} />
            </div>
            <div class="space-y-1.5">
              <Label for="holiday-last">{t("holidays.lastDay")}</Label>
              <DatePicker id="holiday-last" placeholder={t("form.datePlaceholder")} value={lastDay()} onChange={setLastDay} />
            </div>
          </div>
          <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
          <div class="flex gap-2 border-t border-border-hairline pt-4">
            <Button type="submit" disabled={pending()}>{editing() ? t("common.save") : t("common.create")}</Button>
            <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>{t("common.cancel")}</Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={deleteTarget() !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("holidays.delete")}
        summary={t("holidays.deleteConfirm", { name: deleteTarget()?.name ?? "" })}
        variant="destructive"
        onConfirm={async () => {
          const target = deleteTarget();
          if (!target) return;
          setError("");
          try {
            await deleteHolidayById(target.id);
            await refetch();
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
