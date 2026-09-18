import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { getInsightByUserId, getInsightRunReport, insightRunReportUrl, postInsightRunReport } from "@/api/insights";
import { getUserSearch } from "@/api/users";
import { ApiError, formatApiError, type InsightRun, type PersonRef, type StudentInsight } from "@/api/client";
import { InsightDetail } from "@/components/insights/insight-detail";
import { Button } from "@/components/ui/button";
import { EmptyInline } from "@/components/ui/empty-inline";
import { ErrorAlert } from "@/components/ui/error-alert";
import { IconCopy, IconDownload, IconFileText, IconReportAnalytics } from "@/components/ui/icons";
import { SidePanel } from "@/components/ui/side-panel";
import { runReportText, type RunReportKey } from "@/i18n/insights-run-report";
import { formatDateTime } from "@/lib/format";
import {
  buildRunReportMarkdown,
  buildRunReportModel,
  confidenceText,
  failedStageText,
  formatRunDuration,
  moduleLabel,
  pendingStudentsLine,
  runReportFileName,
  runReportHtmlFileName,
  runReportStatusLabel,
  studentAttendanceText,
  studentMarksText,
  studentStatusText,
  type RunReportModel,
} from "@/lib/insight-run-report";
import { personLabel } from "@/lib/person";
import { createFlash } from "@/lib/flash";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
import { usePreferences } from "@/stores/preferences-context";

/** The roster door pages at 200; `loadMoreRoster` walks the pages on request. */
const ROSTER_PAGE = 200;
/**
 * Signals are read one student at a time — the backend serves no school-level
 * aggregate — so the report reads a bounded first slice on open and offers the
 * rest behind a control that names the count. Never a silent cap.
 */
const AUTO_SIGNAL_LIMIT = 60;
const SIGNAL_CONCURRENCY = 6;
const PRINT_BODY_CLASS = "insight-report-printing";
const PRINT_ROOT_CLASS = "insight-report-print-root";

/**
 * Print shows the report and nothing else: the panel is a modal outside
 * `#root`, so the app chrome is hidden by body class rather than by targeting
 * the app root. Kept as one inline sheet so the report ships without touching
 * a global stylesheet.
 */
const PRINT_STYLES = `
.${PRINT_ROOT_CLASS} { display: none; }
@media print {
  /* Hide everything that does not CONTAIN the print document: the app root and
     every other portal, including the panel this report is shown in. Hiding
     \`body > *:not(.${PRINT_ROOT_CLASS})\` would hide the portal's own wrapper
     div (the class sits on its child), which prints a blank page. */
  body.${PRINT_BODY_CLASS} > *:not(:has(.${PRINT_ROOT_CLASS})) { display: none !important; }
  .${PRINT_ROOT_CLASS} { display: block !important; padding: 0 10mm; color: #000 !important; background: #fff !important; }
  .${PRINT_ROOT_CLASS} * { color: #000 !important; box-shadow: none !important; background: transparent !important; }
  .${PRINT_ROOT_CLASS} h1 { font-size: 15pt; }
  .${PRINT_ROOT_CLASS} h2 { font-size: 12pt; margin: 6mm 0 2mm; border-bottom: 1px solid #888; }
  .${PRINT_ROOT_CLASS} table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  .${PRINT_ROOT_CLASS} th, .${PRINT_ROOT_CLASS} td { border: 1px solid #999; padding: 1.5mm; text-align: left; }
  .${PRINT_ROOT_CLASS} dl { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; }
  .${PRINT_ROOT_CLASS} details { display: none; }
}
`;

/**
 * The run's report as a document. One component renders the panel, the print
 * sheet and (through the same model) the Markdown, so the export cannot drift
 * from what is on screen. `onOpenStudent` is the only interactive affordance
 * and it is absent from the print instance.
 */
function ReportDocument(props: {
  model: RunReportModel;
  /** True while signals are still being read: the school picture is not final. */
  loading?: boolean;
  onOpenStudent?: (id: string) => void;
}) {
  const prefs = usePreferences();
  const tx = (key: RunReportKey, vars?: Record<string, string | number>) =>
    runReportText(prefs.locale(), key, vars);
  const metrics = createMemo(() => {
    const run = props.model.run;
    return [
      { key: "runDay", label: tx("runDay"), value: run.run_day },
      { key: "status", label: tx("status"), value: runReportStatusLabel(prefs.locale(), run.status) },
      { key: "startedAt", label: tx("startedAt"), value: formatDateTime(run.started_at, prefs.locale()) },
      { key: "finishedAt", label: tx("finishedAt"), value: formatDateTime(run.finished_at, prefs.locale()) },
      {
        key: "processed",
        label: tx("processed"),
        value: `${run.students_ok}/${run.students_total}`,
      },
      { key: "skipped", label: tx("skipped"), value: String(run.students_skipped) },
      { key: "failed", label: tx("failed"), value: String(run.students_failed) },
      { key: "rowsWritten", label: tx("rowsWritten"), value: String(run.rows_written) },
      { key: "duration", label: tx("duration"), value: formatRunDuration(run.duration_ms, prefs.locale()) },
      {
        key: "budget",
        label: tx("budget"),
        value: `${run.budget_exceeded ? tx("budgetExceeded") : tx("budgetWithin")} (${formatRunDuration(run.budget_ms, prefs.locale())})`,
      },
    ];
  });

  return (
    <div class="space-y-5">
      <header class="space-y-1">
        <h2 class="text-base font-semibold text-text-strong">{tx("title")}</h2>
        <p class="text-sm text-muted-foreground">{tx("subtitle")}</p>
      </header>

      <section class="space-y-3">
        <h3 class="text-sm font-semibold text-text-strong">{tx("runSection")}</h3>
        <dl class="grid gap-2 sm:grid-cols-2">
          <For each={metrics()}>
            {(metric) => (
              <div class="detail-metric-card">
                <dt class="text-xs text-muted-foreground">{metric.label}</dt>
                <dd class="mono mt-1 text-sm font-medium">{metric.value}</dd>
              </div>
            )}
          </For>
        </dl>
        <Show when={props.model.run.pending_students.length + props.model.run.failed_modules.length > 0}>
          <ul class="space-y-1 text-xs text-warning">
            <Show when={pendingStudentsLine(prefs.locale(), props.model)}>
              {(line) => <li>{line()}</li>}
            </Show>
            <Show when={props.model.run.failed_modules.length > 0}>
              <li>
                {tx("failedModules", {
                  modules: props.model.run.failed_modules
                    .map((stage) => failedStageText(prefs.locale(), stage))
                    .join(", "),
                })}
              </li>
            </Show>
          </ul>
        </Show>
        <Show when={props.model.run.pending_students.length + props.model.run.failed_modules.length === 0}>
          <p class="text-xs text-muted-foreground">{tx("noIssues")}</p>
        </Show>
      </section>

      <section class="space-y-3 border-t border-border-hairline pt-5">
        <h3 class="text-sm font-semibold text-text-strong">{tx("schoolSection")}</h3>
        <Show
          when={props.loading}
          fallback={
            <>
              <p class="text-sm">
                {tx("coverage", { loaded: props.model.coverage.loaded, total: props.model.coverage.total })}
              </p>
              <p class="text-xs text-muted-foreground">{tx("coverageNote")}</p>
              <ul class="space-y-1.5 text-sm">
                <For each={props.model.modules}>
                  {(module) => (
                    <li>
                      <span class={module.with_data === 0 ? "text-warning" : undefined}>
                        {tx("moduleCovered", {
                          label: moduleLabel(prefs.locale(), module.id),
                          withData: module.with_data,
                          total: props.model.coverage.loaded,
                        })}
                        {module.with_data === 0 ? ` → ${tx("noData")}` : ""}
                      </span>
                      <Show when={module.limitation}>
                        {(limitation) => <p class="mt-0.5 text-xs text-muted-foreground">{limitation()}</p>}
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
              <Show when={props.model.modules.every((module) => module.with_data === 0)}>
                <p class="text-xs text-muted-foreground">{tx("modulesEmpty")}</p>
              </Show>
              <p class="text-sm">
                {tx("attention")}: <span class="mono tabular-nums">{props.model.totals.attention}</span> · {tx("cards")}:{" "}
                <span class="mono tabular-nums">{props.model.totals.cards}</span> · {tx("segments")}:{" "}
                <span class="mono tabular-nums">{props.model.totals.segments}</span>
              </p>
              <Show when={props.model.roster_error}>
                {(message) => <p class="text-xs text-destructive">{tx("rosterFailed", { message: message() })}</p>}
              </Show>
              <Show when={props.model.coverage.loaded === 0 && !props.model.roster_error}>
                <p class="text-xs text-muted-foreground">{tx("rosterEmpty")}</p>
              </Show>
            </>
          }
        >
          <p class="text-sm text-muted-foreground">{tx("loadingSignals")}</p>
        </Show>
      </section>

      <section class="space-y-3 border-t border-border-hairline pt-5">
        <h3 class="text-sm font-semibold text-text-strong">
          {tx("studentsSection")} ({props.model.coverage.loaded}/{props.model.coverage.total})
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-left text-xs text-muted-foreground">
              <tr>
                <th class="py-2 pr-3">{tx("student")}</th>
                <th class="py-2 pr-3">{tx("status")}</th>
                <th class="py-2 pr-3">{tx("confidence")}</th>
                <th class="py-2 pr-3 text-right">{tx("attention")}</th>
                <th class="py-2 pr-3 text-right">{tx("cards")}</th>
                <th class="py-2 pr-3">{tx("marksAverage")}</th>
                <th class="py-2 pr-3">{tx("attendanceRate")}</th>
                <th class="py-2 pr-3">{tx("computedAt")}</th>
                <Show when={props.onOpenStudent}>
                  <th class="py-2">{tx("studentAnalysis")}</th>
                </Show>
              </tr>
            </thead>
            <tbody>
              <For each={props.model.students}>
                {(student) => (
                  <tr class="border-t border-border-hairline">
                    <td class="py-2 pr-3 font-medium text-text-strong">{student.name}</td>
                    <td class="py-2 pr-3 text-muted-foreground">{studentStatusText(prefs.locale(), student)}</td>
                    <td class="py-2 pr-3 text-muted-foreground">
                      {student.confidence == null ? tx("noData") : confidenceText(prefs.locale(), student.confidence)}
                    </td>
                    <td class="mono py-2 pr-3 text-right tabular-nums">{student.attention}</td>
                    <td class="mono py-2 pr-3 text-right tabular-nums">{student.cards}</td>
                    <td class="mono py-2 pr-3 tabular-nums">{studentMarksText(prefs.locale(), student)}</td>
                    <td class="mono py-2 pr-3 tabular-nums">{studentAttendanceText(prefs.locale(), student)}</td>
                    <td class="py-2 pr-3 text-muted-foreground">{formatDateTime(student.computed_at, prefs.locale())}</td>
                    <Show when={props.onOpenStudent}>
                      <td class="py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          class="rounded-lg"
                          onClick={() => props.onOpenStudent?.(student.id)}
                        >
                          {tx("openStudent")}
                        </Button>
                      </td>
                    </Show>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
        <Show when={props.model.students.length === 0}>
          <EmptyInline illustration="people" size="md" title={tx("rosterEmpty")} />
        </Show>
      </section>

      <details class="border-t border-border-hairline pt-5">
        <summary class="cursor-pointer text-sm font-semibold text-text-strong">{tx("technical")}</summary>
        <p class="mt-1 text-xs text-muted-foreground">{tx("technicalHint")}</p>
        <pre class="mono mt-2 overflow-x-auto rounded-lg bg-surface-overlay p-3 text-[11px]">
          {JSON.stringify(props.model.run, null, 2)}
        </pre>
      </details>
    </div>
  );
}

/**
 * The school picture for one run: the ledger row's own counters, the modules'
 * coverage across the students read for it, and every student's headline
 * signals with a door into their own analysis drawer.
 *
 * There is no school-level report route: the run counters come from
 * `GET /insights/runs`, and everything per-student from
 * `GET /insights/students/{id}` — read here, one student at a time, with the
 * coverage count always on screen so a partial read never reads as the school.
 */
export function InsightRunReport(props: { run: InsightRun }) {
  const prefs = usePreferences();
  const tx = (key: RunReportKey, vars?: Record<string, string | number>) =>
    runReportText(prefs.locale(), key, vars);
  const auth = useAuth();
  /** Generation is manager+ — the door refuses anyone below it, so the control is not offered. */
  const canGenerateReport = () => hasMinRole(auth.user()?.role, "manager");
  const [, flash] = createFlash();
  const [generatingReport, setGeneratingReport] = createSignal(false);
  const [reportError, setReportError] = createSignal<string | null>(null);
  const [roster, setRoster] = createSignal<PersonRef[]>([]);
  const [rosterTotal, setRosterTotal] = createSignal(0);
  const [rosterError, setRosterError] = createSignal<string | null>(null);
  const [insights, setInsights] = createSignal<Record<string, StudentInsight>>({});
  const [failures, setFailures] = createSignal<Record<string, string>>({});
  const [loading, setLoading] = createSignal(true);
  const [openStudentId, setOpenStudentId] = createSignal<string | null>(null);
  /** Dynamic membership by definition: ids enter and leave as reads settle. */
  const inFlight = new Set<string>();

  const loadSignals = async (ids: string[]) => {
    const wanted = ids.filter(
      (id) => !inFlight.has(id) && insights()[id] === undefined && failures()[id] === undefined,
    );
    if (wanted.length === 0) return;
    setLoading(true);
    for (let start = 0; start < wanted.length; start += SIGNAL_CONCURRENCY) {
      const batch = wanted.slice(start, start + SIGNAL_CONCURRENCY);
      for (const id of batch) inFlight.add(id);
      const settled = await Promise.all(
        batch.map(async (id) => {
          const [outcome] = await Promise.allSettled([getInsightByUserId(id)]);
          return { id, outcome };
        }),
      );
      const nextInsights = { ...insights() };
      const nextFailures = { ...failures() };
      for (const { id, outcome } of settled) {
        inFlight.delete(id);
        if (outcome.status === "fulfilled") nextInsights[id] = outcome.value;
        else nextFailures[id] = formatApiError(outcome.reason);
      }
      setInsights(nextInsights);
      setFailures(nextFailures);
    }
    setLoading(false);
  };

  const loadRoster = async (offset: number) => {
    setLoading(true);
    try {
      const page = await getUserSearch("", undefined, "student", { limit: ROSTER_PAGE, offset });
      setRoster((current) => (offset === 0 ? page.items : [...current, ...page.items]));
      setRosterTotal(page.total);
      await loadSignals(page.items.slice(0, AUTO_SIGNAL_LIMIT).map((person) => person.id));
    } catch (error) {
      setRosterError(formatApiError(error));
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    document.body.classList.add(PRINT_BODY_CLASS);
    onCleanup(() => document.body.classList.remove(PRINT_BODY_CLASS));
    void loadRoster(0);
  });

  const model = createMemo(() =>
    buildRunReportModel({
      run: props.run,
      roster: roster(),
      insights: insights(),
      errors: failures(),
      coverageTotal: rosterTotal() || roster().length,
      rosterError: rosterError(),
    }),
  );
  const markdown = () => buildRunReportMarkdown(model(), prefs.locale());
  const unloaded = () =>
    roster().filter((person) => insights()[person.id] === undefined && failures()[person.id] === undefined);
  const openedStudent = createMemo(() => {
    const id = openStudentId();
    return id ? roster().find((person) => person.id === id) ?? null : null;
  });
  const openedInsight = createMemo(() => {
    const id = openStudentId();
    return id ? insights()[id] ?? null : null;
  });
  const openedFailure = createMemo(() => {
    const id = openStudentId();
    return id ? failures()[id] ?? null : null;
  });

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(markdown());
      flash(tx("copied"));
    } catch {
      flash(tx("copyFailed"));
    }
  };

  const downloadReport = () => {
    const url = URL.createObjectURL(new Blob([markdown()], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = runReportFileName(props.run.run_day);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    flash(tx("downloaded"));
  };

  /**
   * The sentence a failed generation shows. A coded refusal (`409`) carries
   * the server's own sentence about why it refused, so that one is shown
   * as-is; everything else goes through the house renderer. The single `409`
   * this control can meet *after* its own `200` — `report_missing` — says the
   * document could not be read back instead: the service did not refuse
   * anything, its document is simply not there.
   */
  const reportFailureText = (err: unknown, readingBack: boolean): string => {
    if (err instanceof ApiError && err.status === 409) {
      return readingBack ? tx("schoolReportUnreadable") : err.message;
    }
    if (err instanceof ApiError && err.status === 503) return tx("schoolReportUnavailable");
    // The house 413 copy is about uploads ("choose a smaller file") — wrong
    // instruction here: nothing was chosen, the service's own document is big.
    if (err instanceof ApiError && err.status === 413) return tx("schoolReportTooLarge");
    return formatApiError(err);
  };

  /**
   * Ask the service for this run day's school-level document, then hand it
   * over. The read-back in between is what keeps a `200` honest: without it a
   * generation that stored nothing would still open a download that answers
   * `409`. The anchor points at the door itself — same-origin, so the session
   * cookie rides along — rather than at bytes this tab fetched.
   */
  const generateSchoolReport = async () => {
    const runDay = props.run.run_day;
    setGeneratingReport(true);
    setReportError(null);
    let readingBack = false;
    try {
      await postInsightRunReport(runDay);
      readingBack = true;
      await getInsightRunReport(runDay);
      const anchor = document.createElement("a");
      anchor.href = insightRunReportUrl(runDay);
      anchor.download = runReportHtmlFileName(runDay);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (err) {
      setReportError(reportFailureText(err, readingBack));
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" class="rounded-lg" disabled={loading()} onClick={() => void copyReport()}>
          <IconCopy class="h-4 w-4" />
          {tx("copy")}
        </Button>
        <Button variant="outline" size="sm" class="rounded-lg" disabled={loading()} onClick={downloadReport}>
          <IconDownload class="h-4 w-4" />
          {tx("download")}
        </Button>
        <Button variant="outline" size="sm" class="rounded-lg" disabled={loading()} onClick={() => window.print()}>
          <IconFileText class="h-4 w-4" />
          {tx("print")}
        </Button>
        <Show when={canGenerateReport()}>
          <Button
            variant="outline"
            size="sm"
            class="rounded-lg"
            disabled={generatingReport()}
            aria-busy={generatingReport()}
            onClick={() => void generateSchoolReport()}
          >
            <IconReportAnalytics class="h-4 w-4" />
            {generatingReport() ? tx("schoolReportGenerating") : tx("schoolReport")}
          </Button>
        </Show>
      </div>

      <Show when={reportError()}>
        {(message) => <ErrorAlert message={message()} />}
      </Show>

      <Show when={unloaded().length > 0}>
        <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-line px-3 py-2">
          <p class="text-xs text-muted-foreground">
            {loading() ? tx("loadingSignals") : tx("coverage", { loaded: model().coverage.loaded, total: model().coverage.total })}
          </p>
          <Button
            variant="outline"
            size="sm"
            class="rounded-lg"
            disabled={loading()}
            onClick={() => void loadSignals(unloaded().map((person) => person.id))}
          >
            {tx("loadAll", { count: unloaded().length })}
          </Button>
        </div>
      </Show>

      <Show when={loading() && unloaded().length === 0 && model().coverage.loaded === 0}>
        <p class="text-sm text-muted-foreground">{tx("loadingSignals")}</p>
      </Show>

      <Show when={rosterTotal() > roster().length}>
        <Button
          variant="outline"
          size="sm"
          class="rounded-lg"
          disabled={loading()}
          onClick={() => void loadRoster(roster().length)}
        >
          {tx("loadMoreRoster")}
        </Button>
      </Show>

      <ReportDocument model={model()} loading={loading()} onOpenStudent={setOpenStudentId} />

      <Portal mount={document.body}>
        <style>{PRINT_STYLES}</style>
        <div class={PRINT_ROOT_CLASS}>
          <ReportDocument model={model()} loading={loading()} />
        </div>
      </Portal>

      <SidePanel
        size="wide"
        open={openStudentId() != null}
        onOpenChange={(open) => {
          if (!open) setOpenStudentId(null);
        }}
        title={personLabel(openedStudent())}
        description={tx("studentAnalysis")}
      >
        <Show keyed when={openedInsight()}>
          {(insight) => <InsightDetail insight={insight} />}
        </Show>
        <Show when={openedFailure()}>
          {(message) => <p class="text-sm text-muted-foreground">{tx("loadFailed", { message: message() })}</p>}
        </Show>
        <Show when={openStudentId() != null && !openedInsight() && !openedFailure()}>
          <EmptyInline illustration="charts" size="md" title={tx("noSummary")} hint={tx("noModules")} />
        </Show>
      </SidePanel>
    </div>
  );
}
