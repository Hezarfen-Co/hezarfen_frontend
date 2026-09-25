import { For, Show, createEffect, createSignal } from "solid-js";
import { postInstanceWeeklyPlanMaterialize } from "@/api/instances";
import { formatApiError, type MaterializeReport } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { SidePanel } from "@/components/ui/side-panel";
import { dateInputToEndOfDayMs, dateTimeInputToMs, isoDateToInput } from "@/lib/datetime-input";
import { useT } from "@/stores/preferences-context";

/**
 * Turns a section's resolved weekly plan into dated lessons. Always previews
 * first (a dry run writes nothing), then the same range is applied — the call
 * is additive and idempotent, so a retry never doubles a lesson.
 */
export function MaterializePanel(props: {
  instanceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** limits.weekly_plan.max_materialize_days */
  maxDays?: number;
  onApplied: (report: MaterializeReport) => void | Promise<void>;
}) {
  const t = useT();
  const [from, setFrom] = createSignal("");
  const [to, setTo] = createSignal("");
  const [preview, setPreview] = createSignal<MaterializeReport | null>(null);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    if (!props.open) return;
    setFrom("");
    setTo("");
    setPreview(null);
    setError("");
  });

  const range = () => {
    const fromMs = dateTimeInputToMs(from(), "00:00");
    const toMs = dateInputToEndOfDayMs(to());
    if (fromMs === null || toMs === null || toMs < fromMs) return null;
    return { from: fromMs, to: toMs };
  };

  const run = async (apply: boolean) => {
    const body = range();
    if (!body) {
      setError(t("weeklyPlan.rangeInvalid"));
      return;
    }
    const days = Math.round((body.to - body.from) / 86_400_000);
    if (props.maxDays && days > props.maxDays) {
      setError(t("weeklyPlan.rangeTooLong", { days: props.maxDays }));
      return;
    }
    setError("");
    setPending(true);
    try {
      const report = await postInstanceWeeklyPlanMaterialize(props.instanceId, { ...body, apply });
      if (apply) {
        props.onOpenChange(false);
        await props.onApplied(report);
      } else {
        setPreview(report);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel open={props.open} onOpenChange={props.onOpenChange} title={t("weeklyPlan.generate")} description={t("weeklyPlan.generateHelp")}>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="materialize-from">{t("weeklyPlan.from")}</Label>
            <DatePicker id="materialize-from" placeholder={t("form.datePlaceholder")} value={from()} onChange={(value) => { setFrom(value); setPreview(null); }} />
          </div>
          <div class="space-y-1.5">
            <Label for="materialize-to">{t("weeklyPlan.to")}</Label>
            <DatePicker id="materialize-to" placeholder={t("form.datePlaceholder")} value={to()} onChange={(value) => { setTo(value); setPreview(null); }} />
          </div>
        </div>

        <Show when={preview()}>
          {(report) => (
            <div class="space-y-3 rounded-xl border border-border-line bg-surface-tint p-3 text-sm">
              <p class="font-medium">
                {t("weeklyPlan.previewSummary", {
                  candidates: report().candidates,
                  existing: report().skipped_existing,
                  holiday: report().skipped_holiday,
                })}
              </p>
              <Show when={report().candidates === 0}>
                <p class="text-muted-foreground">{t("weeklyPlan.nothingToCreate")}</p>
              </Show>
              <Show when={report().blocked.length > 0}>
                <div class="space-y-1">
                  <p class="text-xs font-medium text-text-subtle">{t("weeklyPlan.blockedDays")}</p>
                  <ul class="flex flex-wrap gap-1.5 text-xs">
                    <For each={report().blocked}>
                      {(day) => <li class="rounded-md border border-border-line bg-surface-base px-2 py-0.5 font-mono">{isoDateToInput(day.date)}</li>}
                    </For>
                  </ul>
                </div>
              </Show>
            </div>
          )}
        </Show>

        <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>

        <div class="flex flex-wrap gap-2 border-t border-border-hairline pt-4">
          <Show
            when={preview() && preview()!.candidates > 0}
            fallback={<Button type="button" disabled={pending() || !from() || !to()} onClick={() => void run(false)}>{t("weeklyPlan.preview")}</Button>}
          >
            <Button type="button" disabled={pending()} onClick={() => void run(true)}>
              {t("weeklyPlan.apply", { count: preview()!.candidates })}
            </Button>
          </Show>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </div>
    </SidePanel>
  );
}
