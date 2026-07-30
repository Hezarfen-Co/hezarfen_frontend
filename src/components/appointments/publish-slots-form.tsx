import { createSignal, Show } from "solid-js";
import { APPOINTMENT_LIMITS, formatApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNow } from "@/lib/create-now";
import { dateInputToEndOfDayMs, dateTimeInputToMs } from "@/lib/datetime-input";
import { useT } from "@/stores/preferences-context";

export type PublishSlotsValues = {
  starts_at: number;
  ends_at: number;
  note: string | null;
  repeat_weekly: boolean;
  until: number | null;
};

export function PublishSlotsForm(props: {
  onSubmit: (values: PublishSlotsValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const now = createNow();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const [startsDate, setStartsDate] = createSignal("");
  const [startsTime, setStartsTime] = createSignal("");
  const [endsDate, setEndsDate] = createSignal("");
  const [endsTime, setEndsTime] = createSignal("");
  const [note, setNote] = createSignal("");
  const [repeatWeekly, setRepeatWeekly] = createSignal(false);
  const [untilDate, setUntilDate] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const validate = (starts: number | null, ends: number | null, until: number | null): string | null => {
    if (starts == null || ends == null) return t("form.timeOrder");
    // `check_window` rejects `starts >= ends` (400) — a zero-length slot is not a window.
    if (ends <= starts) return t("form.timeOrder");
    const grace = now() - 60_000;
    if (starts < grace || ends < grace) return t("form.timePast");
    if (repeatWeekly()) {
      if (until == null) return t("appointments.untilRequired");
      if (until < grace) return t("form.timePast");
      const occurrences = Math.floor((until - starts) / WEEK_MS) + 1;
      if (occurrences > APPOINTMENT_LIMITS.maxSlotOccurrences) {
        return t("appointments.tooManyOccurrences", { count: occurrences, max: APPOINTMENT_LIMITS.maxSlotOccurrences });
      }
    }
    if (note().length > APPOINTMENT_LIMITS.noteMaxLen) return t("form.descriptionMax");
    return null;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = dateTimeInputToMs(startsDate(), startsTime());
    const ends_at = dateTimeInputToMs(endsDate(), endsTime());
    const until = repeatWeekly() ? dateInputToEndOfDayMs(untilDate()) : null;
    const v = validate(starts_at, ends_at, until);
    if (v) {
      setError(v);
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit({
        starts_at: starts_at!,
        ends_at: ends_at!,
        note: note().trim() ? note().trim() : null,
        repeat_weekly: repeatWeekly(),
        until,
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form class="space-y-4" onSubmit={handleSubmit}>
      <div class="grid gap-3 rounded-lg border border-amber-500/15 bg-amber-500/3 p-4">
        <div class="space-y-1.5">
          <Label for="slot-starts">{t("appointments.starts")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker id="slot-starts" class="h-9" placeholder={t("form.datePlaceholder")} value={startsDate()} onChange={setStartsDate} />
            <Input
              id="slot-starts-time"
              class="h-9 font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="09:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={startsTime()}
              aria-label={t("appointments.starts")}
              onInput={(e) => setStartsTime(e.currentTarget.value)}
            />
          </div>
        </div>
        <div class="space-y-1.5">
          <Label for="slot-ends">{t("appointments.ends")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker id="slot-ends" class="h-9" placeholder={t("form.datePlaceholder")} value={endsDate()} onChange={setEndsDate} />
            <Input
              id="slot-ends-time"
              class="h-9 font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="10:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={endsTime()}
              aria-label={t("appointments.ends")}
              onInput={(e) => setEndsTime(e.currentTarget.value)}
            />
          </div>
        </div>
      </div>

      <div class="space-y-1.5 rounded-lg border border-sky-500/15 bg-sky-500/2.5 p-4">
        <Label for="slot-note">{t("appointments.note")}</Label>
        <Textarea
          id="slot-note"
          class="min-h-20"
          value={note()}
          maxlength={APPOINTMENT_LIMITS.noteMaxLen}
          rows={2}
          placeholder={t("appointments.notePlaceholder")}
          onInput={(e) => setNote(e.currentTarget.value)}
        />
      </div>

      <div class="space-y-3 rounded-lg border border-violet-500/15 bg-violet-500/3 p-4">
        <label class="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border"
            checked={repeatWeekly()}
            onChange={(e) => setRepeatWeekly(e.currentTarget.checked)}
          />
          <span>{t("appointments.repeatWeekly")}</span>
        </label>
        <p class="text-xs text-muted-foreground">{t("appointments.repeatWeeklyHelp")}</p>
        <Show when={repeatWeekly()}>
          <div class="space-y-1.5 pt-1">
            <Label for="slot-until">{t("appointments.until")}</Label>
            <DatePicker id="slot-until" class="h-9" placeholder={t("form.datePlaceholder")} value={untilDate()} onChange={setUntilDate} />
          </div>
        </Show>
      </div>

      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
        <Button type="submit" class="h-10 flex-1 sm:flex-none" disabled={pending()}>
          {t("appointments.publish")}
        </Button>
        {props.onCancel && (
          <Button type="button" variant="outline" class="h-10 flex-1 sm:flex-none" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
