import { For, Show, createEffect, createSignal } from "solid-js";
import { formatApiError } from "@/api/client";
import type { CreateWeeklySlotBody } from "@/api/offerings";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/ui/side-panel";
import { WEEKDAYS, hhmmToMinutes, weekdayLabel } from "@/lib/weekly-plan";
import { usePreferences, useT } from "@/stores/preferences-context";

/** The add-a-lesson-time form a weekly plan (offering or section) shares. */
export function WeeklySlotForm(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateWeeklySlotBody) => Promise<void>;
  /** Inclusive minute bounds from limits.weekly_plan. */
  minMinute?: number;
  maxMinute?: number;
  maxTopicLen?: number;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [weekday, setWeekday] = createSignal("1");
  const [starts, setStarts] = createSignal("");
  const [ends, setEnds] = createSignal("");
  const [topic, setTopic] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  createEffect(() => {
    if (!props.open) return;
    setStarts("");
    setEnds("");
    setTopic("");
    setError("");
  });

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    const startsAt = hhmmToMinutes(starts());
    const endsAt = hhmmToMinutes(ends());
    const min = props.minMinute ?? 0;
    const max = props.maxMinute ?? 24 * 60;
    if (startsAt === null || endsAt === null || endsAt <= startsAt || startsAt < min || endsAt > max) {
      setError(t("weeklyPlan.timeInvalid"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit({ weekday: Number(weekday()), starts_at: startsAt, ends_at: endsAt, topic: topic().trim() || null });
      props.onOpenChange(false);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <SidePanel guardUnsaved open={props.open} onOpenChange={props.onOpenChange} title={t("weeklyPlan.addSlot")} description={t("weeklyPlan.help")}>
      <form class="space-y-4" noValidate onSubmit={submit}>
        <div class="space-y-1.5">
          <Label for="slot-weekday">{t("weeklyPlan.weekday")}</Label>
          <Select id="slot-weekday" value={weekday()} onChange={(e) => setWeekday(e.currentTarget.value)}>
            <For each={WEEKDAYS}>{(day) => <option value={String(day)}>{weekdayLabel(day, locale())}</option>}</For>
          </Select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="space-y-1.5">
            <Label for="slot-starts">{t("weeklyPlan.starts")}</Label>
            <Input id="slot-starts" class="h-9 font-mono placeholder:text-muted-foreground/45" inputMode="numeric" placeholder="09:00" value={starts()} onInput={(e) => setStarts(e.currentTarget.value)} />
          </div>
          <div class="space-y-1.5">
            <Label for="slot-ends">{t("weeklyPlan.ends")}</Label>
            <Input id="slot-ends" class="h-9 font-mono placeholder:text-muted-foreground/45" inputMode="numeric" placeholder="09:40" value={ends()} onInput={(e) => setEnds(e.currentTarget.value)} />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label for="slot-topic">{t("weeklyPlan.topic")}</Label>
          <Input id="slot-topic" maxlength={props.maxTopicLen} value={topic()} onInput={(e) => setTopic(e.currentTarget.value)} />
          <p class="text-xs text-muted-foreground">{t("weeklyPlan.topicHint")}</p>
        </div>
        <Show when={error()}><Alert variant="destructive">{error()}</Alert></Show>
        <div class="flex gap-2 border-t border-border-hairline pt-4">
          <Button type="submit" disabled={pending()}>{t("common.save")}</Button>
          <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{t("common.cancel")}</Button>
        </div>
      </form>
    </SidePanel>
  );
}
