import { createSignal } from "solid-js";
import { APPOINTMENT_LIMITS, formatApiError, type AppointmentSlot } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import { personLabel } from "@/lib/person";
import { usePreferences, useT } from "@/stores/preferences-context";

export function BookAppointmentForm(props: {
  slot: AppointmentSlot;
  onSubmit: (reason: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const { locale } = usePreferences();
  const [reason, setReason] = createSignal("");
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const value = reason().trim();
    if (!value) {
      setError(t("appointments.reasonRequired"));
      return;
    }
    if (value.length > APPOINTMENT_LIMITS.reasonMaxLen) {
      setError(t("form.descriptionMax"));
      return;
    }
    setError("");
    setPending(true);
    try {
      await props.onSubmit(value);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <form class="space-y-4" onSubmit={handleSubmit}>
      <div class="space-y-1.5 rounded-2xl border border-sky-500/15 bg-sky-500/2.5 p-4 text-sm">
        <p>
          <span class="text-muted-foreground">{t("appointments.teacher")}:</span>{" "}
          <span class="font-medium">{personLabel(props.slot.teacher)}</span>
        </p>
        <p class="mono text-xs text-muted-foreground">
          {formatDateTime(props.slot.starts_at, locale())} — {formatDateTime(props.slot.ends_at, locale())}
        </p>
      </div>

      <div class="space-y-1.5 rounded-2xl border border-violet-500/15 bg-violet-500/3 p-4">
        <Label for="book-reason">{t("appointments.reason")}</Label>
        <Textarea
          id="book-reason"
          class="min-h-28"
          value={reason()}
          maxlength={APPOINTMENT_LIMITS.reasonMaxLen}
          rows={4}
          required
          placeholder={t("appointments.reasonPlaceholder")}
          onInput={(e) => setReason(e.currentTarget.value)}
        />
      </div>

      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
        <Button type="submit" class="h-10 flex-1 sm:flex-none" disabled={pending()}>
          {t("appointments.book")}
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
