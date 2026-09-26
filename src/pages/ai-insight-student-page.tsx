import { Show, createMemo, createSignal } from "solid-js";
import { useParams } from "@tanstack/solid-router";
import { createResource } from "@/lib/create-resource";
import { formatApiError, type InsightConfidence } from "@/api/client";
import { getInsightByUserId, postInsightComputeByUserId } from "@/api/insights";
import { InsightStudentAnalysisTabs } from "@/components/insights/insight-student-analysis-tabs";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { RouteGuard } from "@/components/layout/route-guard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Badge } from "@/components/ui/badge";
import { IconSparkles } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { loadInsightStudents } from "@/lib/insight-students";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { runReportText } from "@/i18n/insights-run-report";
import { useAuth } from "@/stores/auth-context";
import { formatDate } from "@/lib/format";
import { usePreferences } from "@/stores/preferences-context";

function confidenceVariant(confidence: InsightConfidence) {
  if (confidence === "stable") return "success" as const;
  if (confidence === "exploratory") return "warning" as const;
  return "secondary" as const;
}

export default function AiInsightStudentPage() {
  return (
    <RouteGuard>
      <AiInsightStudentContent />
    </RouteGuard>
  );
}

/**
 * One student's analysis as a page of its own — it used to open in a side
 * panel over the list, too narrow for the module sections, attention items
 * and recommendation cards it carries. The name comes from the same student
 * list the board reads (a parent's children, the school's students for
 * staff): `/users/{id}` is admin-only.
 */
function AiInsightStudentContent() {
  const auth = useAuth();
  const prefs = usePreferences();
  const t = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const params = useParams({ from: "/ai/insights/$userId" });
  const userId = () => params().userId;
  const role = () => auth.user()?.role;
  const canRecompute = () => hasMinRole(role(), "teacher");
  const [queuing, setQueuing] = createSignal(false);
  const [actionError, setActionError] = createSignal("");
  const [flash, setFlash] = createFlash();

  // A failed roster read is kept apart from an empty one: swallowing it into
  // `[]` told a rate-limited viewer the student was "not in your list" and
  // put the raw account id where the name goes.
  const [roster, { refetch: refetchRoster }] = createResource(
    () => role() ?? null,
    (viewerRole) => loadInsightStudents(viewerRole).then(
      (list) => ({ list, error: null as unknown }),
      (error: unknown) => ({ list: null, error }),
    ),
  );
  const person = createMemo(() => roster()?.list?.find((student) => student.id === userId()) ?? null);
  const notInList = () => roster()?.list != null && !person();
  const [insight, { refetch }] = createResource(userId, (id) => getInsightByUserId(id));
  const studentName = () => {
    const current = person();
    return current ? personLabel(current) : null;
  };
  const initials = () => (studentName() ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
  const confidenceLabel = (confidence: InsightConfidence) =>
    confidence === "none" || confidence === "exploratory" || confidence === "stable"
      ? t(`insights.confidence.${confidence}`)
      : confidence;
  // The app-wide "18 Eyl 2026" date, not a numeric 18.09.2026.
  const numericDate = (value: number | null | undefined) => formatDate(value, prefs.locale());

  const recompute = async () => {
    const current = person();
    if (queuing()) return;
    setQueuing(true);
    setActionError("");
    try {
      await postInsightComputeByUserId(userId());
      setFlash(current ? t("insights.recomputeQueued", { student: personLabel(current) }) : t("insights.recomputeQueuedUnnamed"));
    } catch (error) {
      setActionError(formatApiError(error));
    } finally {
      setQueuing(false);
    }
  };

  return (
    <div class="w-full space-y-5">
      <div class="space-y-2">
        <Breadcrumbs items={[{ label: t("insights.title"), to: "/ai/insights" }, { label: studentName() ?? t("insights.studentAnalysis") }]} />
      </div>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={actionError()}>
        <Alert variant="destructive">{actionError()}</Alert>
      </Show>
      <Show when={roster()?.error}>
        {(error) => (
          <ErrorAlert
            message={runReportText(prefs.locale(), "rosterFailed", { message: formatApiError(error()) })}
            onRetry={() => void refetchRoster()}
          />
        )}
      </Show>
      <Show when={notInList()}>
        <Alert variant="warning">{t("insights.notFound")}</Alert>
      </Show>
      <Show when={insight.error}>
        <ErrorAlert message={formatApiError(insight.error)} onRetry={() => void refetch()} />
      </Show>
      <Show when={!insight.error} fallback={null}>
        <Show when={insight()} fallback={<PageSpinner />}>
          {(value) => (
            <div class="space-y-4">
              <section class="rounded-xl border border-border-line bg-surface-base shadow-xs">
                <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div class="flex min-w-0 items-center gap-4">
                    <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-xs">
                      {initials()}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">{t("insights.title")}</p>
                      <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 class="truncate text-2xl font-semibold tracking-tight text-text-strong">{studentName() ?? t("insights.studentAnalysis")}</h1>
                        <Show
                          when={value().summary}
                          fallback={<span class="text-xs text-muted-foreground">{t("insights.noSummary")}</span>}
                        >
                          {(summary) => (
                            <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span class="tabular-nums">{numericDate(summary().computed_at)}</span>
                              <span aria-hidden="true">·</span>
                              <Badge variant={confidenceVariant(summary().confidence)} class="rounded-full">
                                {confidenceLabel(summary().confidence)}
                              </Badge>
                            </div>
                          )}
                        </Show>
                      </div>
                      <Show when={studentName()}>
                        <p class="mt-0.5 text-sm text-muted-foreground">{t("insights.studentAnalysis")}</p>
                      </Show>
                    </div>
                  </div>
                  {/* Header actions are toolbar pills: h-10 below `sm` and on touch, h-8 above. */}
                  <div class="flex flex-wrap items-center gap-2 [&_button]:h-10 [&_button]:rounded-full [&_button]:px-3.5 [&_button]:text-[13px] sm:[&_button]:h-8 touch:[&_button]:h-10">
                    <Show when={canRecompute()}>
                      <Button size="sm" disabled={queuing()} onClick={() => void recompute()}>
                        <IconSparkles class="h-4 w-4" />
                        {queuing() ? t("insights.recomputing") : t("insights.recompute")}
                      </Button>
                    </Show>
                  </div>
                </div>
              </section>

              <section class="data-shell p-4 sm:p-5">
                <InsightStudentAnalysisTabs insight={value()} />
              </section>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
