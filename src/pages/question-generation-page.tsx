import { For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { createResource } from "@/lib/create-resource";
import { ApiError, formatApiError, type RagQuestionSet } from "@/api/client";
import { postRagQuestions } from "@/api/rag";
import { BankQuestionForm } from "@/components/exams/bank-question-form";
import { PageHeader } from "@/components/layout/page-header";
import { RouteGuard } from "@/components/layout/route-guard";
import { GeneratedQuestionCard } from "@/components/question-generation/generated-question-card";
import { ragCopy } from "@/components/rag/rag-copy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconSparkles } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SidePanel } from "@/components/ui/side-panel";
import { Textarea } from "@/components/ui/textarea";
import { createFlash } from "@/lib/flash";
import { cn } from "@/lib/cn";
import { loadStudyScopes, parsePages } from "@/lib/question-generation";
import { useModules } from "@/stores/modules-context";
import { usePreferences, useT } from "@/stores/preferences-context";

export default function QuestionGenerationPage() {
  return (
    <RouteGuard minRole="teacher">
      <QuestionGenerationContent />
    </RouteGuard>
  );
}

/** The service's own difficulty vocabulary; the backend defaults to `orta`. */
const DIFFICULTIES = ["kolay", "orta", "zor"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];
/** The door holds `n` to 1..=20. */
const MAX_COUNT = 20;

type Draft = { courseId: string; text: string };

/**
 * A teacher's question generator: practice questions over a page range of
 * the course notes behind one of their own (grade, course) pairs, via
 * `POST /rag/questions`. Nothing is stored — a question worth keeping goes to
 * the bank through the ordinary bank form, prefilled.
 */
function QuestionGenerationContent() {
  const t = useT();
  const { locale } = usePreferences();
  const rag = () => ragCopy(locale());
  const modules = useModules();
  const [flash, setFlash] = createFlash();

  const [scopes] = createResource(() => loadStudyScopes());
  const [scopeKey, setScopeKey] = createSignal("");
  const [pagesInput, setPagesInput] = createSignal("");
  const [difficulty, setDifficulty] = createSignal<Difficulty>("orta");
  const [count, setCount] = createSignal("5");
  const [seed, setSeed] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pagesError, setPagesError] = createSignal("");
  const [result, setResult] = createSignal<RagQuestionSet | null>(null);
  const [draft, setDraft] = createSignal<Draft | null>(null);

  const scope = () => scopes()?.find((option) => option.key === scopeKey()) ?? null;
  const courses = createMemo(() => [...new Map((scopes() ?? []).map((option) => [option.course.id, option.course])).values()]);
  const canBank = () => modules.isEnabled("bank_questions");
  const difficultyLabel = (value: Difficulty) =>
    value === "kolay" ? rag().difficultyEasy : value === "zor" ? rag().difficultyHard : rag().difficultyMedium;

  const generate = async (event: SubmitEvent) => {
    event.preventDefault();
    const current = scope();
    if (!current || pending()) return;
    const pages = parsePages(pagesInput());
    if (!pages) {
      setPagesError(t("qgen.pagesInvalid"));
      return;
    }
    setPagesError("");
    setError("");
    setPending(true);
    try {
      setResult(
        await postRagQuestions({
          ders: current.ders,
          sinif: current.sinif,
          pages,
          n: Math.min(MAX_COUNT, Math.max(1, Math.trunc(Number(count())) || 5)),
          difficulty: difficulty(),
          seed_question: seed().trim() || null,
        }),
      );
    } catch (err) {
      setResult(null);
      if (err instanceof ApiError && err.status === 503) setError(t("qgen.unavailable"));
      else if (err instanceof ApiError && err.status === 403) setError(t("qgen.outOfScope"));
      else setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <div class="w-full space-y-5">
      <section class="data-shell p-4 sm:p-5">
        <PageHeader title={t("nav.questionGeneration")} description={t("qgen.subtitle")} />
      </section>

      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>

      <div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form class="data-shell space-y-4 p-4 sm:p-5" onSubmit={(event) => void generate(event)}>
          <Show
            when={scopes.loading || (scopes()?.length ?? 0) > 0}
            fallback={<p class="text-sm leading-6 text-muted-foreground">{t("qgen.noScopes")}</p>}
          >
            <div class="space-y-1.5">
              <Label for="qgen-scope">{t("qgen.scope")}</Label>
              <SearchableSelect
                id="qgen-scope"
                value={scopeKey()}
                onChange={setScopeKey}
                placeholder={t("qgen.scopePlaceholder")}
                disabled={scopes.loading}
                options={(scopes() ?? []).map((option) => ({ value: option.key, label: option.label }))}
              />
            </div>

            <div class="space-y-1.5">
              <Label for="qgen-pages">{t("qgen.pages")}</Label>
              <Input
                id="qgen-pages"
                value={pagesInput()}
                placeholder="3-7, 10"
                inputmode="numeric"
                aria-invalid={pagesError() ? "true" : undefined}
                onInput={(event) => {
                  setPagesInput(event.currentTarget.value);
                  setPagesError("");
                }}
              />
              <p class={cn("text-xs", pagesError() ? "text-destructive-text" : "text-muted-foreground")}>
                {pagesError() || t("qgen.pagesHint")}
              </p>
            </div>

            <div class="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-3">
              <div class="space-y-1.5">
                <Label>{t("qgen.difficulty")}</Label>
                <div class="flex gap-0.5 rounded-lg border bg-muted/40 p-0.5" role="radiogroup" aria-label={t("qgen.difficulty")}>
                  <For each={DIFFICULTIES}>
                    {(value) => (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={difficulty() === value}
                        class={cn(
                          "h-8 flex-1 rounded-md px-2 text-xs font-medium transition-colors",
                          difficulty() === value ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground",
                        )}
                        onClick={() => setDifficulty(value)}
                      >
                        {difficultyLabel(value)}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div class="space-y-1.5">
                <Label for="qgen-count">{t("qgen.count")}</Label>
                <Input id="qgen-count" type="number" min={1} max={MAX_COUNT} value={count()} onInput={(event) => setCount(event.currentTarget.value)} />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="qgen-seed">{t("qgen.seed")}</Label>
              <Textarea id="qgen-seed" rows={3} class="resize-none" value={seed()} maxlength={2000} onInput={(event) => setSeed(event.currentTarget.value)} />
              <p class="text-xs text-muted-foreground">{t("qgen.seedHint")}</p>
            </div>

            <Button type="submit" size="sm" class="w-full rounded-lg" disabled={!scope() || !pagesInput().trim() || pending()}>
              <IconSparkles class="h-4 w-4" />
              {pending() ? t("qgen.generating") : t("qgen.generate")}
            </Button>
          </Show>
        </form>

        <section class="data-shell min-h-[20rem] space-y-4 p-4 sm:p-5" aria-label={t("qgen.results")} aria-live="polite">
          <h2 class="text-base font-semibold text-text-strong">{t("qgen.results")}</h2>
          <Show when={error()}>
            <Alert variant="destructive">{error()}</Alert>
          </Show>
          <Switch>
            <Match when={pending()}>
              <ul class="space-y-3" aria-hidden="true">
                <For each={[0, 1, 2]}>{() => <li class="h-24 animate-pulse rounded-xl border border-border-hairline bg-surface-tint" />}</For>
              </ul>
            </Match>
            <Match when={result()}>
              {(set) => (
                <Show
                  when={!set().abstained && set().items.length > 0}
                  fallback={
                    <p class="rounded-lg border border-border-hairline bg-surface-tint px-4 py-3 text-sm text-muted-foreground">
                      {set().reason ? rag().abstainedReason(set().reason) : t("qgen.noQuestions")}
                    </p>
                  }
                >
                  <Show when={set().pages.length > 0}>
                    <p class="text-xs text-muted-foreground">{t("qgen.coveredPages", { pages: set().pages.join(", ") })}</p>
                  </Show>
                  <ol class="space-y-3">
                    <For each={set().items}>
                      {(item, index) => (
                        <GeneratedQuestionCard
                          index={index()}
                          question={item.question}
                          answer={item.answer}
                          onAddToBank={canBank() && scope() ? () => setDraft({ courseId: scope()!.course.id, text: item.question }) : undefined}
                        />
                      )}
                    </For>
                  </ol>
                </Show>
              )}
            </Match>
            <Match when={!error()}>
              <EmptyInline class="py-12" size="md" illustration="exams" title={t("qgen.resultsEmpty")} />
            </Match>
          </Switch>
        </section>
      </div>

      <SidePanel
        guardUnsaved
        size="wide"
        open={draft() != null}
        onOpenChange={(open) => !open && setDraft(null)}
        title={t("qgen.addToBank")}
      >
        <Show when={draft()} keyed>
          {(current) => (
            <BankQuestionForm
              draft={current}
              courses={courses()}
              onSaved={() => {
                setDraft(null);
                setFlash(t("qgen.savedToBank"));
              }}
              onCancel={() => setDraft(null)}
            />
          )}
        </Show>
      </SidePanel>
    </div>
  );
}
