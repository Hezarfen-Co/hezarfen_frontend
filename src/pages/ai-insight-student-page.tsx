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
import { IconAlert, IconChart, IconDownload, IconSparkles } from "@/components/ui/icons";
import { PageSpinner } from "@/components/ui/page-spinner";
import { createFlash } from "@/lib/flash";
import { loadInsightStudents } from "@/lib/insight-students";
import { personLabel } from "@/lib/person";
import { hasMinRole } from "@/lib/roles";
import { useAuth } from "@/stores/auth-context";
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

  const [students] = createResource(() => role() ?? null, (viewerRole) => loadInsightStudents(viewerRole).catch(() => []));
  const person = createMemo(() => (students() ?? []).find((student) => student.id === userId()) ?? null);
  const [insight, { refetch }] = createResource(userId, (id) => getInsightByUserId(id));
  const studentName = () => person() ? personLabel(person()!) : userId();
  const initials = () => studentName()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
  const confidenceLabel = (confidence: InsightConfidence) =>
    confidence === "none" || confidence === "exploratory" || confidence === "stable"
      ? t(`insights.confidence.${confidence}`)
      : confidence;
  const numericDate = (value: number | null | undefined) => {
    if (value == null) return "—";
    return new Intl.DateTimeFormat(prefs.locale() === "tr" ? "tr-TR" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  };

  const recompute = async () => {
    const current = person();
    if (queuing()) return;
    setQueuing(true);
    setActionError("");
    try {
      await postInsightComputeByUserId(userId());
      setFlash(t("insights.recomputeQueued", { student: current ? personLabel(current) : userId() }));
    } catch (error) {
      setActionError(formatApiError(error));
    } finally {
      setQueuing(false);
    }
  };

  return (
    <div class="mx-auto w-full max-w-[1240px] space-y-5">
      <div class="space-y-2">
        <Breadcrumbs items={[{ label: t("insights.title"), to: "/ai/insights" }, { label: studentName() }]} />
      </div>
      <Show when={flash()}>
        <Alert variant="success">{flash()}</Alert>
      </Show>
      <Show when={actionError()}>
        <Alert variant="destructive">{actionError()}</Alert>
      </Show>
      <Show when={students() && !person()}>
        <Alert variant="warning">{t("insights.notFound")}</Alert>
      </Show>
      <Show when={insight.error}>
        <ErrorAlert message={formatApiError(insight.error)} onRetry={() => void refetch()} />
      </Show>
      <Show when={!insight.error} fallback={null}>
        <Show when={insight()} fallback={<PageSpinner />}>
          {(value) => (
            <div class="space-y-5">
              <section class="overflow-hidden rounded-2xl border border-border-line bg-surface-base shadow-xs">
                <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div class="flex min-w-0 items-center gap-4">
                    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground shadow-xs">
                      {initials()}
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-primary-text">{t("insights.title")}</p>
                      <h1 class="mt-1 truncate text-2xl font-semibold tracking-tight text-text-strong">{studentName()}</h1>
                      <p class="mt-1 text-sm text-muted-foreground">{t("insights.studentAnalysis")}</p>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" class="rounded-lg" disabled title={t("comingSoon.title")}>
                      <IconDownload class="h-4 w-4" />
                      {t("common.export")}
                    </Button>
                    <Show when={canRecompute()}>
                      <Button size="sm" class="rounded-lg" disabled={queuing()} onClick={() => void recompute()}>
                        <IconSparkles class="h-4 w-4" />
                        {queuing() ? t("insights.recomputing") : t("insights.recompute")}
                      </Button>
                    </Show>
                  </div>
                </div>
                <div class="grid border-t border-border-line sm:grid-cols-4">
                  <div class="border-border-line px-5 py-3 sm:border-r">
                    <p class="text-xs text-muted-foreground">{t("insights.computedAt")}</p>
                    <p class="mono mt-1 text-sm font-semibold text-text-strong">{numericDate(value().summary?.computed_at)}</p>
                  </div>
                  <div class="border-border-line px-5 py-3 sm:border-r">
                    <p class="text-xs text-muted-foreground">{t("insights.confidence")}</p>
                    <Show
                      when={value().summary}
                      fallback={<span class="mt-1 block text-sm text-muted-foreground">—</span>}
                    >
                      {(summary) => <Badge variant={confidenceVariant(summary().confidence)} class="mt-1 rounded-full">{confidenceLabel(summary().confidence)}</Badge>}
                    </Show>
                  </div>
                  <div class="border-border-line px-5 py-3 sm:border-r">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconAlert class="h-3.5 w-3.5" />{t("insights.attention")}</p>
                    <p class="mono mt-1 text-lg font-semibold text-text-strong">{value().attention.length}</p>
                  </div>
                  <div class="px-5 py-3">
                    <p class="flex items-center gap-1.5 text-xs text-muted-foreground"><IconChart class="h-3.5 w-3.5" />{t("insights.recommendations")}</p>
                    <p class="mono mt-1 text-lg font-semibold text-text-strong">{value().cards.length}</p>
                  </div>
                </div>
              </section>

              <section class="data-shell p-5">
                <InsightStudentAnalysisTabs insight={value()} />
              </section>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
