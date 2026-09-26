import { For, Show, Suspense, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { ColumnDef } from "@tanstack/solid-table";
import {
  deleteAcademicYearById,
  getAcademicYears,
  patchAcademicYearById,
  postAcademicYear,
  postAcademicYearArchive,
  postAcademicYearRollover,
} from "@/api/academic-years";
import { formatApiError } from "@/api/client";
import type { AcademicYear, GradePromotion } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { DetailField } from "@/components/ui/detail-field";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconArchive, IconEdit, IconEye, IconPlus, IconRotateCcw, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDate } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";
import { GradeLevelSelect } from "@/components/classes/grade-level-select";

const YEAR_PAGE_SIZE = 10;

function dateInputFromMs(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function dateInputToMs(value: string): number | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date.getTime();
}

export default function AcademicYearsPage() {
  return (
    <RouteGuard minRole="manager">
      <AcademicYearsContent />
    </RouteGuard>
  );
}

function AcademicYearsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [list, { refetch }] = createResource(async () => (await getAcademicYears({ limit: 100 })).items);
  const years = () => list() ?? [];
  const openYears = createMemo(() => years().filter((year) => year.archived_at == null));

  const [panelOpen, setPanelOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [starts, setStarts] = createSignal("");
  const [ends, setEnds] = createSignal("");
  // A row being written may still have a half unpicked.
  const [promotions, setPromotions] = createSignal<{ from_grade: number | null; to_grade: number | null }[]>([]);
  const [editing, setEditing] = createSignal<AcademicYear | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<AcademicYear | null>(null);
  const [detail, setDetail] = createSignal<AcademicYear | null>(null);
  const [archiveTarget, setArchiveTarget] = createSignal<AcademicYear | null>(null);
  const [rolloverTarget, setRolloverTarget] = createSignal<AcademicYear | null>(null);
  const [rolloverFrom, setRolloverFrom] = createSignal("");
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

  const resetForm = () => {
    setName("");
    setStarts("");
    setEnds("");
    setPromotions([]);
    setEditing(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setPanelOpen(true);
  };

  const startEdit = (year: AcademicYear) => {
    setEditing(year);
    setName(year.name);
    setStarts(dateInputFromMs(year.starts_at));
    setEnds(dateInputFromMs(year.ends_at));
    setPromotions(year.grade_promotions.map((pair) => ({ ...pair })));
    setError("");
    setPanelOpen(true);
  };

  const save = async (event: SubmitEvent) => {
    event.preventDefault();
    setError("");
    const starts_at = dateInputToMs(starts());
    const ends_at = dateInputToMs(ends());
    if (starts_at == null || ends_at == null) {
      setError(t("form.datePlaceholder"));
      return;
    }
    if (ends_at < starts_at) {
      setError(t("form.timeOrder"));
      return;
    }
    // A blank half is a half-written rule, not a policy — drop it rather than
    // sending a promotion the rollover cannot act on.
    const grade_promotions = promotions().filter(
      (pair): pair is GradePromotion => pair.from_grade !== null && pair.to_grade !== null,
    );

    setPending(true);
    try {
      const current = editing();
      if (current) {
        await patchAcademicYearById(current.id, { name: name().trim(), starts_at, ends_at, grade_promotions });
        setFlash(t("common.saved"));
      } else {
        await postAcademicYear({ name: name().trim(), starts_at, ends_at, grade_promotions });
        setFlash(t("common.created"));
      }
      resetForm();
      setPanelOpen(false);
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const columns = createMemo<ColumnDef<AcademicYear>[]>(() => [
    {
      accessorKey: "name",
      header: t("settings.name"),
      size: 170,
      minSize: 150,
      // One line: a long name ends in "…" (full name on hover and in the
      // detail panel); the archived flag has its own column.
      meta: { cellClass: "max-w-0" },
      cell: (cell) => <span class="block truncate font-medium" title={cell.row.original.name}>{cell.row.original.name}</span>,
    },
    {
      accessorKey: "starts_at",
      header: t("events.starts"),
      size: 150,
      minSize: 145,
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => <span class="whitespace-nowrap text-sm">{formatDate(cell.row.original.starts_at, locale())}</span>,
    },
    {
      accessorKey: "ends_at",
      header: t("events.ends"),
      size: 150,
      minSize: 145,
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => <span class="whitespace-nowrap text-sm">{formatDate(cell.row.original.ends_at, locale())}</span>,
    },
    {
      id: "classes",
      accessorFn: (row) => row.class_count,
      header: t("academicYears.classCount"),
      size: 90,
      minSize: 80,
      meta: { cellClass: "text-center", align: "center" },
    },
    {
      id: "terms",
      accessorFn: (row) => row.term_count,
      header: t("academicYears.termCount"),
      size: 90,
      minSize: 80,
      meta: { cellClass: "text-center", align: "center" },
    },
    {
      accessorKey: "archived_at",
      header: t("academicYears.archived"),
      size: 115,
      minSize: 105,
      meta: { cellClass: "whitespace-nowrap" },
      cell: (cell) => (
        <Show when={cell.row.original.archived_at != null} fallback={<span class="text-muted-foreground">—</span>}>
          <Badge variant="secondary" class="shrink-0 whitespace-nowrap rounded-full">{t("academicYears.archived")}</Badge>
        </Show>
      ),
    },
    {
      id: "actions",
      header: t("common.actions"),
      meta: { headerClass: "w-[110px] min-w-[110px] max-w-[110px] h-[45px] text-center whitespace-nowrap", cellClass: "text-center" },
      cell: (cell) => {
        const year = cell.row.original;
        const archived = year.archived_at != null;
        return (
          <TableRowActions
            label={t("common.actions")}
            actions={[
              { label: t("common.view"), icon: <IconEye class="h-4 w-4" />, onSelect: () => setDetail(year) },
              ...(archived
                ? []
                : [
                    { label: t("common.edit"), icon: <IconEdit class="h-4 w-4" />, onSelect: () => startEdit(year) },
                    {
                      label: t("academicYears.rollover"),
                      icon: <IconRotateCcw class="h-4 w-4" />,
                      onSelect: () => {
                        setRolloverFrom("");
                        setRolloverTarget(year);
                      },
                    },
                    {
                      label: t("academicYears.archive"),
                      icon: <IconArchive class="h-4 w-4" />,
                      onSelect: () => setArchiveTarget(year),
                    },
                  ]),
              {
                label: t("common.delete"),
                icon: <IconTrash class="h-4 w-4" />,
                destructive: true,
                onSelect: () => setDeleteTarget(year),
              },
            ]}
          />
        );
      },
    },
  ]);

  return (
    <div class="space-y-6">
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !panelOpen()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <section class="space-y-4 p-0">
        <Suspense fallback={<DataTableSkeleton columns={6} rows={6} />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <DataTable
            urlState
            title={t("academicYears.title")}
            description={t("academicYears.subtitle")}
            actions={
              <Button type="button" size="sm" class="min-w-[7.5rem]" onClick={openCreate}>
                <IconPlus class="h-4 w-4" />
                {t("academicYears.new")}
              </Button>
            }
            columns={columns()}
            data={years()}
            tableClass="min-w-160"
            filterColumn="name"
            enablePagination
            pageSize={YEAR_PAGE_SIZE}
            empty={t("academicYears.empty")}
            onRowClick={(year) => setDetail(year)}
          />
        </Suspense>
      </section>

      <SidePanel open={detail() != null} onOpenChange={(open) => !open && setDetail(null)} title={detail()?.name ?? ""} description={t("academicYears.year")}>
        <Show when={detail()} keyed>
          {(year) => (
            <div class="space-y-5">
              <div class="rounded-xl border border-border-hairline bg-surface-tint px-4 py-3">
                <p class="text-xs font-medium text-muted-foreground">{t("settings.name")}</p>
                <p class="mt-1 break-words text-sm font-medium">{year.name}</p>
              </div>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label={t("events.starts")} value={formatDate(year.starts_at, locale())} />
                <DetailField label={t("events.ends")} value={formatDate(year.ends_at, locale())} />
                <DetailField label={t("academicYears.classCount")} value={String(year.class_count)} />
                <DetailField label={t("academicYears.termCount")} value={String(year.term_count)} />
                <DetailField label={t("academicYears.archived")} value={year.archived_at != null ? formatDate(year.archived_at, locale()) : "—"} />
              </div>
              <Show when={year.archived_at == null}>
                <Button
                  type="button"
                  variant="outline"
                  class="rounded-lg"
                  onClick={() => {
                    setDetail(null);
                    startEdit(year);
                  }}
                >
                  <IconEdit class="h-4 w-4" />
                  {t("common.edit")}
                </Button>
              </Show>
            </div>
          )}
        </Show>
      </SidePanel>

      <SidePanel guardUnsaved
        open={panelOpen()}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) resetForm();
        }}
        title={editing() ? t("common.edit") : t("academicYears.new")}
        description={t("academicYears.subtitle")}
      >
        <form class="space-y-4" onSubmit={save}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="year-name">{t("settings.name")}</Label>
            <Input id="year-name" class="rounded-lg" required maxlength={100} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="year-starts">{t("events.starts")}</Label>
            <DatePicker id="year-starts" placeholder={t("form.datePlaceholder")} required value={starts()} onChange={setStarts} />
          </div>
          <div class="space-y-1.5">
            <Label for="year-ends">{t("events.ends")}</Label>
            <DatePicker id="year-ends" placeholder={t("form.datePlaceholder")} required value={ends()} onChange={setEnds} />
          </div>

          <div class="space-y-2 rounded-xl border border-border-line bg-surface-tint p-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-semibold">{t("academicYears.promotions")}</p>
                <p class="mt-0.5 text-xs text-muted-foreground">{t("academicYears.promotionsHelp")}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="rounded-lg"
                onClick={() => setPromotions((rows) => [...rows, { from_grade: null, to_grade: null }])}
              >
                <IconPlus class="h-4 w-4" />
                {t("academicYears.addPromotion")}
              </Button>
            </div>
            <For each={promotions()}>
              {(pair, index) => (
                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2">
                  <GradeLevelSelect
                    id={`promotion-from-${index()}`}
                    value={pair.from_grade}
                    onChange={(level) =>
                      setPromotions((rows) => rows.map((row, i) => (i === index() ? { ...row, from_grade: level } : row)))
                    }
                  />
                  <GradeLevelSelect
                    id={`promotion-to-${index()}`}
                    value={pair.to_grade}
                    onChange={(level) =>
                      setPromotions((rows) => rows.map((row, i) => (i === index() ? { ...row, to_grade: level } : row)))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-9 w-9 rounded-md text-muted-foreground hover:text-destructive-text"
                    aria-label={t("common.delete")}
                    onClick={() => setPromotions((rows) => rows.filter((_, i) => i !== index()))}
                  >
                    <IconTrash class="h-4 w-4" />
                  </Button>
                </div>
              )}
            </For>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setPanelOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending()}>
              {editing() ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <SidePanel guardUnsaved
        open={rolloverTarget() !== null}
        onOpenChange={(open) => !open && setRolloverTarget(null)}
        title={t("academicYears.rollover")}
        description={rolloverTarget()?.name ?? ""}
      >
        <form
          class="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const target = rolloverTarget();
            const from = rolloverFrom();
            if (!target || !from) return;
            void (async () => {
              setPending(true);
              setError("");
              try {
                const result = await postAcademicYearRollover(target.id, from);
                setFlash(t("academicYears.rolloverDone", { classes: result.classes, students: result.students }));
                setRolloverTarget(null);
                await refetch();
              } catch (err) {
                setError(formatApiError(err));
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <p class="text-sm text-muted-foreground">{t("academicYears.rolloverHelp")}</p>
          <div class="space-y-1.5">
            <Label for="rollover-from">{t("academicYears.rolloverFrom")}</Label>
            <Select id="rollover-from" class="rounded-lg" value={rolloverFrom()} onChange={(e) => setRolloverFrom(e.currentTarget.value)}>
              <option value="">{t("academicYears.unassigned")}</option>
              <For each={years().filter((year) => year.id !== rolloverTarget()?.id)}>
                {(year) => <option value={year.id}>{year.name}</option>}
              </For>
            </Select>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" class="h-10 rounded-lg" onClick={() => setRolloverTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" class="h-10 rounded-lg" disabled={pending() || !rolloverFrom()}>
              {t("academicYears.rollover")}
            </Button>
          </div>
        </form>
      </SidePanel>

      <ConfirmDialog
        open={archiveTarget() != null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title={t("academicYears.archive")}
        variant="destructive"
        summary={`${archiveTarget()?.name ?? ""} — ${t("academicYears.archiveConfirm")}`}
        onConfirm={async () => {
          const year = archiveTarget();
          if (!year) return;
          try {
            await postAcademicYearArchive(year.id);
            setFlash(t("academicYears.archived"));
            await refetch();
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setArchiveTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={`${deleteTarget()?.name ?? ""} — ${t("academicYears.deleteConfirm")}`}
        onConfirm={async () => {
          const year = deleteTarget();
          if (!year) return;
          try {
            await deleteAcademicYearById(year.id);
            setFlash(t("common.deleted"));
            await refetch();
          } catch (err) {
            setError(formatApiError(err));
          } finally {
            setDeleteTarget(null);
          }
        }}
      />

      <Show when={openYears().length === 0 && years().length > 0}>
        <Alert>{t("academicYears.empty")}</Alert>
      </Show>
    </div>
  );
}
