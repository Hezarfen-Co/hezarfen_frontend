import { For, Show } from "solid-js";
import type { InsightConfidence, StudentInsight } from "@/api/client";
import {
  InsightEvidenceView,
  InsightModuleView,
  InsightTechnicalDetails,
} from "@/components/insights/insight-module-views";
import { Badge } from "@/components/ui/badge";
import { EmptyInline } from "@/components/ui/empty-inline";
import { IconAlert, IconChart, IconSparkles } from "@/components/ui/icons";
import { detailText, dimensionLabel, type InsightDetailKey } from "@/i18n/insights-detail";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { isRecord } from "@/lib/is-record";
import { usePreferences } from "@/stores/preferences-context";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const clampPercent = (value: number) => Math.min(100, Math.max(0, value * 100));

function confidenceVariant(confidence: InsightConfidence) {
  if (confidence === "stable") return "success" as const;
  if (confidence === "exploratory") return "warning" as const;
  return "secondary" as const;
}

/** Attention triggers and segment dimensions arrive as machine names; a name
 *  with no label here is left out of the human view rather than shown raw. */
const TRIGGER_KEYS: Record<string, InsightDetailKey> = {
  attendance: "trigger.attendance",
  homework: "trigger.homework",
  mark_trend: "trigger.mark_trend",
};
const PRODUCT_KEYS: Record<string, InsightDetailKey> = {
  O1: "product.O1",
  O2: "product.O2",
  O3: "product.O3",
  O4: "product.O4",
  T3: "product.T3",
  T4: "product.T4",
};

export function InsightDetail(props: { insight: StudentInsight; mode?: "full" | "cards" }) {
  const prefs = usePreferences();
  const tx = (key: string, vars?: Record<string, string | number>) => prefs.t(key as never, vars);
  const confidenceLabel = (confidence: InsightConfidence) =>
    confidence === "none" || confidence === "exploratory" || confidence === "stable"
      ? tx(`insights.confidence.${confidence}`)
      : confidence;

  /**
   * Course ids are the payload's own keys; a school manager reads titles.
   * The marks module is the one place a title is carried, and it keys the same
   * ids the attendance module and the cards use, so it answers for all of
   * them. `undefined` means "no title known" — never the id itself.
   */
  const courseTitle = (id?: string | null): string | null => {
    if (!id) return null;
    const marks: unknown = props.insight.summary?.marks;
    const allCourses = isRecord(marks) ? marks.courses : undefined;
    const entry = isRecord(allCourses) ? allCourses[id] : undefined;
    const title = isRecord(entry) ? entry.course_title : undefined;
    return typeof title === "string" && title.length > 0 ? title : null;
  };
  /**
   * The attention list's own contract: a null `course` means the fact is
   * school-wide, so that is the only case that may say so. A course id whose
   * title never made it into the payload is NOT school-wide — saying it were
   * invents a fact on a student's report, so it is labelled as unresolved
   * (the id itself stays in the technical disclosure).
   */
  const courseLine = (id?: string | null) => {
    if (!id) return tx("insights.schoolWide");
    return courseTitle(id) ?? detailText("detail.unresolvedCourse");
  };
  /** A card scope is `<dimension>=<label>`; the label half is already Turkish. */
  const scopeText = (scope?: string | null) => {
    if (!scope) return null;
    const [dimension, label] = scope.split("=");
    const name = dimensionLabel(dimension);
    if (!name) return null;
    return label ? `${name}: ${label}` : name;
  };

  const summarySections = () => {
    const summary = props.insight.summary;
    if (!summary) return [];
    return [
      { id: "attendance", label: tx("insights.modules.attendance"), value: summary.attendance },
      { id: "marks", label: tx("insights.modules.marks"), value: summary.marks },
      { id: "study", label: tx("insights.modules.study"), value: summary.study },
      { id: "submission", label: tx("insights.modules.submission"), value: summary.submission },
    ];
  };

  return (
    <div class="@container space-y-5">
      <div class="space-y-5" data-testid="insight-human">
        <Show when={props.mode !== "cards"}>
          <section class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <IconSparkles class="h-4 w-4 text-primary-text" />
                <h3 class="text-sm font-semibold text-text-strong">{tx("insights.summary")}</h3>
              </div>
              <Show when={props.insight.summary}>
                {(summary) => (
                  <Badge variant={confidenceVariant(summary().confidence)} class="rounded-full">
                    {confidenceLabel(summary().confidence)}
                  </Badge>
                )}
              </Show>
            </div>

            <Show
              when={props.insight.summary}
              fallback={
                <EmptyInline
                  illustration="charts"
                  size="md"
                  title={tx("insights.noSummary")}
                  hint={tx("insights.noSummaryHint")}
                />
              }
            >
              {(summary) => (
                <>
                  <div class="grid gap-2 @md:grid-cols-2">
                    <div class="detail-metric-card">
                      <p class="text-xs text-muted-foreground">{tx("insights.computedAt")}</p>
                      <p class="mono mt-1 text-sm font-medium">{formatDateTime(summary().computed_at, prefs.locale())}</p>
                    </div>
                    <div class="detail-metric-card">
                      <p class="text-xs text-muted-foreground">{tx("insights.retainUntil")}</p>
                      <p class="mono mt-1 text-sm font-medium">{formatDateTime(summary().retain_until, prefs.locale())}</p>
                    </div>
                  </div>
                  <div class="space-y-3">
                    <For each={summarySections()}>
                      {(section) => (
                        <article class="space-y-3 rounded-xl border border-border-line bg-surface-base p-4">
                          <h4 class="text-sm font-semibold text-text-strong">{section.label}</h4>
                          <Show
                            when={section.value != null}
                            fallback={<p class="text-xs text-muted-foreground">{tx("insights.sectionNotComputed")}</p>}
                          >
                            <InsightModuleView module={section.id} value={section.value} courseTitle={courseTitle} />
                          </Show>
                        </article>
                      )}
                    </For>
                  </div>
                </>
              )}
            </Show>
          </section>
        </Show>

        <Show when={props.mode !== "cards"}>
          <section class="space-y-3 border-t border-border-hairline pt-5">
            <div class="flex items-center gap-2">
              <IconAlert class="h-4 w-4 text-warning-text" />
              <h3 class="text-sm font-semibold text-text-strong">{tx("insights.attention")}</h3>
              <Badge variant="warning" class="rounded-full">{props.insight.attention.length}</Badge>
            </div>
            <Show
              when={props.insight.attention.length > 0}
              fallback={<EmptyInline title={tx("insights.noAttention")} illustration="empty" />}
            >
              <div class="space-y-3">
                <For each={props.insight.attention}>
                  {(item) => (
                    <article class="space-y-3 rounded-xl border border-warning/25 bg-warning/5 p-4">
                      <div class="flex flex-wrap items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-sm font-medium leading-5 text-text-strong">{item.fact}</p>
                          <p class="mt-1 text-xs text-muted-foreground">
                            {courseLine(item.course)} · {formatDateTime(item.window_from, prefs.locale())} – {formatDateTime(item.window_to, prefs.locale())}
                          </p>
                        </div>
                        <Show when={TRIGGER_KEYS[item.trigger]}>
                          {(key) => <Badge variant="outline" class="rounded-full">{detailText(key())}</Badge>}
                        </Show>
                      </div>
                      <InsightEvidenceView value={item.evidence} />
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </section>
        </Show>

        <section class={cn("space-y-3", props.mode !== "cards" && "border-t border-border-hairline pt-5")}>
          <div class="flex items-center gap-2">
            <IconSparkles class="h-4 w-4 text-primary-text" />
            <h3 class="text-sm font-semibold text-text-strong">{tx("insights.recommendations")}</h3>
            <Badge variant="secondary" class="rounded-full">{props.insight.cards.length}</Badge>
          </div>
          <Show
            when={props.insight.cards.length > 0}
            fallback={<EmptyInline title={tx("insights.noRecommendations")} illustration="empty" />}
          >
            <div class="space-y-3">
              <For each={props.insight.cards}>
                {(card) => {
                  const context = () => [courseTitle(card.course), scopeText(card.scope)].filter(Boolean).join(" · ");
                  return (
                    <article class="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <Badge class="rounded-full">
                          {PRODUCT_KEYS[card.product] ? detailText(PRODUCT_KEYS[card.product]) : detailText("product.unknown")}
                        </Badge>
                        <Badge variant={confidenceVariant(card.confidence)} class="rounded-full">
                          {confidenceLabel(card.confidence)}
                        </Badge>
                      </div>
                      <Show when={context().length > 0}>
                        <p class="text-xs text-muted-foreground">{context()}</p>
                      </Show>
                      <InsightEvidenceView value={card.evidence} />
                      <p class="text-[11px] text-muted-foreground">
                        {tx("insights.expiresAt")}: {formatDateTime(card.expires_at, prefs.locale())}
                      </p>
                    </article>
                  );
                }}
              </For>
            </div>
          </Show>
        </section>

        <Show when={props.mode !== "cards"}>
          <section class="space-y-3 border-t border-border-hairline pt-5">
            <div class="flex items-center gap-2">
              <IconChart class="h-4 w-4 text-info-text" />
              <h3 class="text-sm font-semibold text-text-strong">{tx("insights.segments")}</h3>
              <Badge variant="info" class="rounded-full">{props.insight.segments.length}</Badge>
            </div>
            <Show
              when={props.insight.segments.length > 0}
              fallback={<EmptyInline title={tx("insights.noSegments")} illustration="charts" />}
            >
              <div class="space-y-3">
                <For each={props.insight.segments}>
                  {(segment) => (
                    <article class="space-y-3 rounded-xl border border-border-line bg-surface-base p-4">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p class="text-sm font-semibold text-text-strong">{segment.label}</p>
                          <Show when={dimensionLabel(segment.dimension)}>
                            {(label) => <p class="text-xs text-muted-foreground">{label()}</p>}
                          </Show>
                        </div>
                        <Badge variant={confidenceVariant(segment.confidence)} class="rounded-full">
                          {confidenceLabel(segment.confidence)}
                        </Badge>
                      </div>
                      <div class="space-y-1.5">
                        <div class="flex items-center justify-between text-xs">
                          <span class="text-muted-foreground">{tx("insights.accuracy")}</span>
                          <span class="font-mono font-semibold">{percent(segment.accuracy)}</span>
                        </div>
                        <div class="h-2.5 overflow-hidden rounded-full bg-surface-fill">
                          <div class="h-full rounded-full bg-info" style={{ width: `${clampPercent(segment.accuracy)}%` }} />
                        </div>
                      </div>
                      <div class="grid grid-cols-3 gap-2 text-center">
                        <div class="rounded-lg bg-surface-overlay px-2 py-2">
                          <p class="font-mono text-sm font-semibold">{segment.n_correct}/{segment.n_answers}</p>
                          <p class="text-[11px] text-muted-foreground">{tx("insights.answers")}</p>
                        </div>
                        <div class="rounded-lg bg-surface-overlay px-2 py-2">
                          <p class="font-mono text-sm font-semibold">{percent(segment.overall_accuracy)}</p>
                          <p class="text-[11px] text-muted-foreground">{tx("insights.overall")}</p>
                        </div>
                        <div class="rounded-lg bg-surface-overlay px-2 py-2">
                          <p class={cn("font-mono text-sm font-semibold", segment.contrast < 0 ? "text-destructive-text" : "text-success-text")}>
                            {segment.contrast > 0 ? "+" : ""}{percent(segment.contrast)}
                          </p>
                          <p class="text-[11px] text-muted-foreground">{tx("insights.contrast")}</p>
                        </div>
                      </div>
                    </article>
                  )}
                </For>
              </div>
            </Show>
          </section>
        </Show>
      </div>

      <Show when={props.mode !== "cards"}>
        <InsightTechnicalDetails value={props.insight} />
      </Show>
    </div>
  );
}
