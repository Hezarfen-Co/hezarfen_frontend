import { Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import type { ColumnDef } from "@tanstack/solid-table";
import { deleteTermById } from "@/api/terms";
import { getTerms } from "@/api/terms";
import { patchTermById } from "@/api/terms";
import { postTerm } from "@/api/terms";
import { postTermArchive } from "@/api/terms";
import { postTermUnarchive } from "@/api/terms";
import { formatApiError } from "@/api/client";
import type { Term } from "@/api/client";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconArchive, IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

const TERM_PAGE_SIZE = 10;

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

export default function TermsPage() {
  return (
    <RouteGuard minRole="manager">
      <TermsContent />
    </RouteGuard>
  );
}

function TermsContent() {
  const t = useT();
  const { locale } = usePreferences();
  const [list, { refetch }] = createResource(async () => (await getTerms({ limit: 100 })).items);
  const terms = () => list() ?? [];
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [starts, setStarts] = createSignal("");
  const [ends, setEnds] = createSignal("");
  const [editing, setEditing] = createSignal<Term | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Term | null>(null);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);
  const columns = createMemo<ColumnDef<Term>[]>(() => [
    {
      accessorKey: "name",
      header: t("settings.name"),
      cell: (cell) => <span class="font-medium">{cell.row.original.name}</span>,
    },
    {
      accessorKey: "starts_at",
      header: t("events.starts"),
      cell: (cell) => <span class="mono text-sm">{formatDateTime(cell.row.original.starts_at, locale())}</span>,
    },
    {
      accessorKey: "ends_at",
      header: t("events.ends"),
      cell: (cell) => <span class="mono text-sm">{formatDateTime(cell.row.original.ends_at, locale())}</span>,
    },
    {
      accessorKey: "archived_at",
      header: t("terms.archived"),
      cell: (cell) => (
        <Show when={cell.row.original.archived_at != null} fallback={<span class="text-muted-foreground">—</span>}>
          <Badge variant="secondary" class="rounded-full">{t("terms.archived")}</Badge>
        </Show>
      ),
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
              label: t("common.edit"),
              icon: <IconEdit class="h-4 w-4" />,
              onSelect: () => startEdit(cell.row.original),
            },
            cell.row.original.archived_at == null
              ? {
                  label: t("terms.archive"),
                  icon: <IconArchive class="h-4 w-4" />,
                  onSelect: () => void toggleArchive(cell.row.original, true),
                }
              : {
                  label: t("terms.unarchive"),
                  icon: <IconArchive class="h-4 w-4" />,
                  onSelect: () => void toggleArchive(cell.row.original, false),
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

  const resetForm = () => {
    setName("");
    setStarts("");
    setEnds("");
    setEditing(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setPanelOpen(true);
  };

  const startEdit = (term: Term) => {
    setName(term.name);
    setStarts(dateInputFromMs(term.starts_at));
    setEnds(dateInputFromMs(term.ends_at));
    setEditing(term);
    setError("");
    setPanelOpen(true);
  };
  const toggleArchive = async (term: Term, archive: boolean) => {
    setError("");
    try {
      if (archive) {
        await postTermArchive(term.id);
      } else {
        await postTermUnarchive(term.id);
      }
      await refetch();
      setFlash(t("common.saved"));
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const save = async (e: SubmitEvent) => {
    e.preventDefault();
    setError("");
    const starts_at = dateInputToMs(starts());
    const ends_at = dateInputToMs(ends());
    if (starts_at == null || ends_at == null) {
      setError(t("terms.dateRequired"));
      return;
    }
    if (ends_at < starts_at) {
      setError(t("form.timeOrder"));
      return;
    }
    setPending(true);
    try {
      const current = editing();
      if (current) {
        await patchTermById(current.id, { name: name().trim(), starts_at, ends_at });
        setFlash(t("common.saved"));
      } else {
        await postTerm({ name: name().trim(), starts_at, ends_at });
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

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <PageHeader
          eyebrow={t("nav.admin")}
          title={t("terms.title")}
          description={t("terms.subtitle")}
          actions={
            <Button type="button" size="sm" class="min-w-30 rounded-lg" onClick={openCreate}>
              <IconPlus class="h-4 w-4" />
              {t("terms.create")}
            </Button>
          }
        />
      </div>

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={error() && !panelOpen()}>
        <Alert variant="destructive">{error()}</Alert>
      </Show>

      <section class="data-shell space-y-4 border-sky-500/15 bg-sky-500/2.5 p-4">
        <Suspense fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <Show
            when={terms().length > 0}
            fallback={
              <EmptyState
                title={t("terms.empty")}
              />
            }
          >
            <DataTable columns={columns()} data={terms()} tableClass="min-w-160" filterColumn="name" enablePagination pageSize={TERM_PAGE_SIZE} />
          </Show>
        </Suspense>
      </section>

      <SidePanel
        open={panelOpen()}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) resetForm();
        }}
        title={editing() ? t("terms.edit") : t("terms.create")}
        description={t("terms.subtitle")}
      >
        <form class="space-y-4" onSubmit={save}>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <div class="space-y-1.5">
            <Label for="term-name">{t("settings.name")}</Label>
            <Input id="term-name" class="rounded-lg" required maxlength={100} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="term-starts">{t("events.starts")}</Label>
            <DatePicker id="term-starts" placeholder={t("form.datePlaceholder")} required value={starts()} onChange={setStarts} />
          </div>
          <div class="space-y-1.5">
            <Label for="term-ends">{t("events.ends")}</Label>
            <DatePicker id="term-ends" placeholder={t("form.datePlaceholder")} required value={ends()} onChange={setEnds} />
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

      <ConfirmDialog
        open={deleteTarget() != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("confirm.deleteTitle")}
        variant="destructive"
        summary={deleteTarget()?.name ?? ""}
        onConfirm={async () => {
          const term = deleteTarget();
          if (!term) return;
          try {
            await deleteTermById(term.id);
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
