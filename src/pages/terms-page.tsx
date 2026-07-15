import { For, Show, Suspense, createSignal } from "solid-js";
import { createResource } from "solid-js";
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
import { DatePicker } from "@/components/ui/date-picker";
import { IconEdit, IconSave, IconTrash } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSpinner } from "@/components/ui/page-spinner";
import { formatDateTime } from "@/lib/format";
import { usePreferences, useT } from "@/stores/preferences-context";

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
  const [terms, { refetch }] = createResource(() => getTerms());
  const [name, setName] = createSignal("");
  const [starts, setStarts] = createSignal("");
  const [ends, setEnds] = createSignal("");
  const [editing, setEditing] = createSignal<Term | null>(null);
  const [deleteTarget, setDeleteTarget] = createSignal<Term | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const resetForm = () => {
    setName("");
    setStarts("");
    setEnds("");
    setEditing(null);
  };

  const startEdit = (term: Term) => {
    setName(term.name);
    setStarts(dateInputFromMs(term.starts_at));
    setEnds(dateInputFromMs(term.ends_at));
    setEditing(term);
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
      } else {
        await postTerm({ name: name().trim(), starts_at, ends_at });
      }
      resetForm();
      await refetch();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-6">
      <PageHeader accent="violet" eyebrow={t("nav.admin")} title={t("terms.title")} description={t("terms.subtitle")} />

      {error() && <Alert variant="destructive">{error()}</Alert>}

      <section class="surface-card space-y-4 p-5">
        <h2 class="font-display text-lg font-semibold">{editing() ? t("terms.edit") : t("terms.create")}</h2>
        <form class="grid gap-3 md:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]" onSubmit={save}>
          <div class="space-y-1.5">
            <Label for="term-name">{t("settings.name")}</Label>
            <Input id="term-name" required maxlength={100} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="term-starts">{t("events.starts")}</Label>
            <DatePicker id="term-starts" placeholder={t("form.datePlaceholder")} required value={starts()} onChange={setStarts} />
          </div>
          <div class="space-y-1.5">
            <Label for="term-ends">{t("events.ends")}</Label>
            <DatePicker id="term-ends" placeholder={t("form.datePlaceholder")} required value={ends()} onChange={setEnds} />
          </div>
          <div class="flex items-end gap-2">
            <Button type="submit" disabled={pending()}>
              <IconSave class="h-4 w-4" />
              {editing() ? t("common.update") : t("common.create")}
            </Button>
            <Show when={editing()}>
              <Button type="button" variant="outline" onClick={resetForm}>{t("common.cancel")}</Button>
            </Show>
          </div>
        </form>
      </section>

      <Suspense fallback={<PageSpinner />}>
        <Show when={terms.error}>
          <Alert variant="destructive">{formatApiError(terms.error)}</Alert>
        </Show>
        <Show
          when={(terms() ?? []).length > 0}
          fallback={<div class="rounded-md border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">{t("terms.empty")}</div>}
        >
          <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <For each={terms() ?? []}>
              {(term) => (
                <article class="surface-card space-y-3 p-4">
                  <div>
                    <h3 class="font-display text-lg font-semibold">{term.name}</h3>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {formatDateTime(term.starts_at, locale())} - {formatDateTime(term.ends_at, locale())}
                    </p>
                  </div>
                  <div class="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => startEdit(term)}>
                      <IconEdit class="h-4 w-4" />
                      {t("common.edit")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" class="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(term)}>
                      <IconTrash class="h-4 w-4" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </article>
              )}
            </For>
          </section>
        </Show>
      </Suspense>

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
