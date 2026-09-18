import { For, Show, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import type { BankQuestion, Subject } from "@/api/client";
import { formatApiError } from "@/api/client";
import { getBankQuestions } from "@/api/bank-questions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { createDebouncedSignal } from "@/lib/create-debounced-signal";
import { totalPages as pagesOf } from "@/lib/list-page";
import { useT } from "@/stores/preferences-context";

const PICKER_PAGE_SIZE = 20;

/** Pick a bank template and copy it into an exam under one of that exam's subjects. */
export function BankQuestionPicker(props: {
  subjects: Subject[];
  onInsert: (bankQuestionId: string, subjectId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [query, setQuery, debouncedQuery] = createDebouncedSignal();
  const [page, setPage] = createSignal(0);
  const [selected, setSelected] = createSignal<BankQuestion | null>(null);
  const [subjectId, setSubjectId] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [templates] = createResource(
    () => ({ page: page(), q: debouncedQuery().trim() }),
    (params) =>
      getBankQuestions({
        limit: PICKER_PAGE_SIZE,
        offset: params.page * PICKER_PAGE_SIZE,
        ...(params.q ? { q: params.q } : {}),
      }),
  );

  // No default: the teacher files the copy under a subject deliberately, or not at all.
  const targetSubject = () => subjectId();
  // .latest: the list lives in a dialog with no <Suspense>, so paging must not blank it.
  const visible = () => templates.latest?.items ?? [];
  const total = () => templates.latest?.total ?? 0;

  const insert = async () => {
    const template = selected();
    const subject = targetSubject();
    if (!template || !subject || pending()) return;
    setError("");
    setPending(true);
    try {
      await props.onInsert(template.id, subject);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="space-y-3">
      <p class="rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-muted-foreground">
        {t("bank.copyNotice")}
      </p>

      <Input
        class="h-9 rounded-lg text-sm"
        value={query()}
        placeholder={t("bank.search")}
        onInput={(event) => {
          setQuery(event.currentTarget.value);
          setPage(0);
        }}
      />

      <div class="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/20 p-1.5">
        <Show
          when={visible().length > 0}
          fallback={<p class="p-3 text-center text-sm text-muted-foreground">{t("bank.pickerEmpty")}</p>}
        >
          <For each={visible()}>
            {(template) => (
              <button
                type="button"
                class={cn(
                  "w-full rounded-md border px-3 py-2 text-left transition-colors",
                  selected()?.id === template.id
                    ? "border-primary/50 bg-primary/10"
                    : "border-transparent bg-background hover:bg-muted/60",
                )}
                onClick={() => setSelected(template)}
              >
                <p class="line-clamp-2 text-sm font-medium">{template.text}</p>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" class="text-[11px]">
                    {template.kind === "choice" ? t("questions.kind.choice") : t("questions.kind.text")}
                  </Badge>
                  <Badge variant="secondary" class="font-mono text-[11px]">
                    {template.points} {t("questions.points")}
                  </Badge>
                </div>
              </button>
            )}
          </For>
        </Show>
      </div>

      <Show when={total() > 0}>
        <p class="text-xs tabular-nums text-muted-foreground">
          {t("bank.countShown", { shown: visible().length, total: total() })}
        </p>
      </Show>
      <Show when={pagesOf(total(), PICKER_PAGE_SIZE) > 1}>
        <PaginationControls page={page()} totalPages={pagesOf(total(), PICKER_PAGE_SIZE)} onPageChange={setPage} />
      </Show>

      <Show when={selected()}>
        {(template) => (
          <div class="space-y-2 rounded-lg border bg-card p-3 shadow-xs">
            <p class="whitespace-pre-wrap text-sm font-medium">{template().text}</p>
            <Show when={template().image}>
              <img
                src={`/api/bank-questions/${template().id}/image`}
                alt={t("questions.image")}
                class="h-40 w-full max-w-md rounded-md border bg-muted/20 object-contain"
              />
            </Show>
            <Show when={template().kind === "choice"}>
              <ol class="grid gap-1 text-sm">
                <For each={template().choices ?? []}>
                  {(choice, index) => (
                    <li
                      class={cn(
                        "flex items-start gap-2 rounded-md px-2 py-1",
                        choice.id === template().correct ? "bg-primary/10 font-medium" : "text-muted-foreground",
                      )}
                    >
                      <span class="font-mono text-[11px] font-bold">{String.fromCharCode(65 + index())}</span>
                      <span class="min-w-0 flex-1 whitespace-pre-wrap">{choice.text}</span>
                    </li>
                  )}
                </For>
              </ol>
            </Show>
          </div>
        )}
      </Show>

      <div class="space-y-1.5">
        <Label for="bank-target-subject" class="text-xs font-semibold text-muted-foreground">
          {t("bank.targetSubject")} <span class="text-destructive-text">*</span>
        </Label>
        <Show
          when={props.subjects.length > 0}
          fallback={<p class="text-xs text-destructive-text">{t("bank.noSubjects")}</p>}
        >
          <Select
            id="bank-target-subject"
            class="h-9 py-1.5 text-sm"
            value={targetSubject()}
            required
            onChange={(event) => setSubjectId(event.currentTarget.value)}
          >
            <option value="">{t("subjects.select")}</option>
            <For each={props.subjects}>{(subject) => <option value={subject.id}>{subject.name}</option>}</For>
          </Select>
          <Show when={!targetSubject()}>
            <p class="text-[11px] text-muted-foreground">{t("bank.targetSubjectHint")}</p>
          </Show>
        </Show>
      </div>

      {error() && <p class="rounded-sm bg-destructive/10 px-3 py-1.5 text-sm text-destructive-text">{error()}</p>}

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          class="h-8 text-xs font-semibold"
          disabled={!selected() || !targetSubject() || pending()}
          onClick={() => void insert()}
        >
          {t("bank.insert")}
        </Button>
        <Button type="button" variant="outline" class="h-8 text-xs font-semibold" onClick={props.onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
