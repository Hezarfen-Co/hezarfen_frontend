import { createSignal } from "solid-js";
import { formatApiError, type Appointment } from "@/api/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNow } from "@/lib/create-now";
import { dateInputFromMs, dateTimeInputToMs, timeInputFromMs } from "@/lib/datetime-input";
import { useT } from "@/stores/preferences-context";

export function RescheduleForm(props: {
  appointment: Appointment;
  onSubmit: (values: { starts_at: number; ends_at: number }) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const now = createNow();
  const [startsDate, setStartsDate] = createSignal(dateInputFromMs(props.appointment.starts_at));
  const [startsTime, setStartsTime] = createSignal(timeInputFromMs(props.appointment.starts_at));
  const [endsDate, setEndsDate] = createSignal(dateInputFromMs(props.appointment.ends_at));
  const [endsTime, setEndsTime] = createSignal(timeInputFromMs(props.appointment.ends_at));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = dateTimeInputToMs(startsDate(), startsTime());
    const ends_at = dateTimeInputToMs(endsDate(), endsTime());
    if (starts_at == null || ends_at == null || ends_at < starts_at) {
      setError(t("form.timeOrder"));
      return;
    }
    const grace = now() - 60_000;
    if (starts_at < grace || ends_at < grace) {
      setError(t("form.timePast"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit({ starts_at, ends_at });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form class="space-y-4" onSubmit={handleSubmit}>
      <div class="grid gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/3 p-4">
        <div class="space-y-1.5">
          <Label for="resched-starts">{t("appointments.starts")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker id="resched-starts" class="h-11" placeholder={t("form.datePlaceholder")} value={startsDate()} onChange={setStartsDate} />
            <Input
              id="resched-starts-time"
              class="h-11 font-mono placeholder:text-muted-foreground/45"
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
          <Label for="resched-ends">{t("appointments.ends")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker id="resched-ends" class="h-11" placeholder={t("form.datePlaceholder")} value={endsDate()} onChange={setEndsDate} />
            <Input
              id="resched-ends-time"
              class="h-11 font-mono placeholder:text-muted-foreground/45"
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

      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
        <Button type="submit" class="h-10 flex-1 sm:flex-none" disabled={pending()}>
          {t("appointments.reschedule")}
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
