import { For, Show, Suspense, createMemo, createResource, createSignal } from "solid-js";
import { deleteTermById } from "@/api/deleteTermById";
import { getTerms } from "@/api/getTerms";
import { patchTermById } from "@/api/patchTermById";
import { postTerm } from "@/api/postTerm";
import { formatApiError } from "@/api/client";
import type { Term } from "@/api/types";
import { RouteGuard } from "@/components/layout/route-guard";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableFrame, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconEdit, IconPlus, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { SidePanel } from "@/components/ui/side-panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableRowActions } from "@/components/ui/table-row-actions";
import { createFlash } from "@/lib/flash";
import { formatDateTime } from "@/lib/format";
import { loadListPage, totalPages as pagesOf } from "@/lib/list-page";
import { usePreferences, useT } from "@/stores/preferences-context";

const TERM_PAGE_SIZE = 12;

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
  const [page, setPage] = createSignal(0);
  const [list, { refetch }] = createResource(
    () => page(),
    async (currentPage) =>
      loadListPage({
        page: currentPage,
        pageSize: TERM_PAGE_SIZE,
        clientMode: false,
        fetch: getTerms,
      }),
  );
  const total = () => list()?.total ?? 0;
  const terms = () => list()?.items ?? [];
  const totalPages = createMemo(() => pagesOf(total(), TERM_PAGE_SIZE));
  const safePage = createMemo(() => Math.min(page(), totalPages() - 1));
  const [panelOpen, setPanelOpen] = createSignal(false);
  const [name, setName] = createSignal("");
  const [starts, setStarts] = createSignal("");
  const [ends, setEnds] = createSignal("");
  const [editing, setEditing] = createSignal<Term | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Term | null>(null);
  const [error, setError] = createSignal("");
  const [flash, setFlash] = createFlash();
  const [pending, setPending] = createSignal(false);

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
        <div class="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>{t("nav.admin")}</span>
          <span>/</span>
          <span>{t("terms.title")}</span>
        </div>
        <PageHeader
          accent="violet"
          eyebrow={t("nav.admin")}
          title={t("terms.title")}
          description={t("terms.subtitle")}
          actions={
            <Button type="button" size="sm" class="min-w-[7.5rem] rounded-lg" onClick={openCreate}>
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

      <section class="data-shell space-y-4 p-4">
        <Suspense fallback={<DataTableSkeleton columns={4} rows={6} />}>
          <Show when={list.error}>
            <ErrorAlert message={formatApiError(list.error)} onRetry={() => void refetch()} />
          </Show>
          <Show
            when={terms().length > 0}
            fallback={
              <EmptyState
                title={t("terms.empty")}
                action={
                  <Button type="button" size="sm" class="rounded-lg" onClick={openCreate}>
                    <IconPlus class="h-4 w-4" />
                    {t("terms.create")}
                  </Button>
                }
              />
            }
          >
            <DataTableFrame>
              <Table class="data-table min-w-[40rem]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("settings.name")}</TableHead>
                    <TableHead>{t("events.starts")}</TableHead>
                    <TableHead>{t("events.ends")}</TableHead>
                    <TableHead class="w-14 text-center">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <For each={terms()}>
                    {(term) => (
                      <TableRow>
                        <TableCell class="font-medium">{term.name}</TableCell>
                        <TableCell class="mono text-sm">{formatDateTime(term.starts_at, locale())}</TableCell>
                        <TableCell class="mono text-sm">{formatDateTime(term.ends_at, locale())}</TableCell>
                        <TableCell>
                          <TableRowActions
                            label={t("common.actions")}
                            actions={[
                              {
                                label: t("common.edit"),
                                icon: <IconEdit class="h-4 w-4" />,
                                onSelect: () => startEdit(term),
                              },
                              {
                                label: t("common.delete"),
                                icon: <IconTrash class="h-4 w-4" />,
                                destructive: true,
                                onSelect: () => setDeleteTarget(term),
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
            <Show when={total() > TERM_PAGE_SIZE}>
              <PaginationControls page={safePage()} totalPages={totalPages()} onPageChange={setPage} />
            </Show>
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
