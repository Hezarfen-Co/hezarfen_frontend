import { createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Event } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/stores/preferences-context";

function dateInputFromMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function timeInputFromMs(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateTimeInputToMs(date: string, time: string): number | null {
  if (!date.trim() && !time.trim()) return null;
  const dateMatch = date.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, dayRaw, monthRaw, yearRaw] = dateMatch;
  const [, hourRaw, minuteRaw] = timeMatch;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d.getHours() !== hour || d.getMinutes() !== minute) return null;
  return d.getTime();
}

export type EventFormValues = {
  title: string;
  description: string;
  starts_at: number | null | undefined;
  ends_at: number | null | undefined;
};

export function EventForm(props: {
  initial?: Partial<Event>;
  submitLabel?: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const isEdit = !!props.initial?.id;
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [startsDate, setStartsDate] = createSignal(dateInputFromMs(props.initial?.starts_at));
  const [startsTime, setStartsTime] = createSignal(timeInputFromMs(props.initial?.starts_at));
  const [endsDate, setEndsDate] = createSignal(dateInputFromMs(props.initial?.ends_at));
  const [endsTime, setEndsTime] = createSignal(timeInputFromMs(props.initial?.ends_at));
  const [startsTouched, setStartsTouched] = createSignal(false);
  const [endsTouched, setEndsTouched] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<EventFormValues | null>(null);

  const resolveTime = (date: string, time: string, touched: boolean): number | null | undefined => {
    if (isEdit && !touched) return undefined;
    return dateTimeInputToMs(date, time);
  };

  const validate = (
    starts: number | null | undefined,
    ends: number | null | undefined,
  ): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (description().length > 2000) return t("form.descriptionMax");
    const s = starts === undefined ? props.initial?.starts_at ?? null : starts;
    const e = ends === undefined ? props.initial?.ends_at ?? null : ends;
    if (startsTouched() && (startsDate().trim() || startsTime().trim()) && starts == null) return t("form.timeOrder");
    if (endsTouched() && (endsDate().trim() || endsTime().trim()) && ends == null) return t("form.timeOrder");
    if (s != null && e != null && e < s) return t("form.timeOrder");
    return null;
  };

  const save = async (values: EventFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isEdit) {
        setTitle("");
        setDescription("");
        setStartsDate("");
        setStartsTime("");
        setEndsDate("");
        setEndsTime("");
        setStartsTouched(false);
        setEndsTouched(false);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = resolveTime(startsDate(), startsTime(), startsTouched());
    const ends_at = resolveTime(endsDate(), endsTime(), endsTouched());
    const v = validate(starts_at, ends_at);
    if (v) {
      setError(v);
      return;
    }
    const values = {
      title: title().trim(),
      description: description(),
      starts_at,
      ends_at,
    };
    if (isEdit) {
      setPendingValues(values);
      setConfirmOpen(true);
      return;
    }
    await save(values);
  };

  return (
    <>
    <form class="space-y-3" onSubmit={handleSubmit}>
      <div class="space-y-1.5">
        <Label for="event-title">{t("form.title")}</Label>
        <Input
          id="event-title"
          class="h-10 rounded-sm"
          value={title()}
          maxlength={200}
          required
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="event-description">{t("form.description")}</Label>
        <Textarea
          id="event-description"
          class="min-h-28 rounded-sm"
          value={description()}
          maxlength={2000}
          rows={3}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </div>
      <div class="grid gap-3">
        <div class="space-y-1.5">
          <Label for="event-starts">{t("events.starts")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker
              id="event-starts"
              class="h-10"
              placeholder={t("form.datePlaceholder")}
              value={startsDate()}
              onChange={(value) => {
                setStartsDate(value);
                setStartsTouched(true);
              }}
            />
            <Input
              id="event-starts-time"
              class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="09:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={startsTime()}
              aria-label={t("exams.startTime")}
              onInput={(e) => {
                setStartsTime(e.currentTarget.value);
                setStartsTouched(true);
              }}
            />
          </div>
          <Show when={isEdit && startsTouched() && !startsDate() && !startsTime()}>
            <p class="text-xs text-muted-foreground">{t("events.clearStart")}</p>
          </Show>
        </div>
        <div class="space-y-1.5">
          <Label for="event-ends">{t("events.ends")}</Label>
          <div class="grid grid-cols-2 gap-2">
            <DatePicker
              id="event-ends"
              class="h-10"
              placeholder={t("form.datePlaceholder")}
              value={endsDate()}
              onChange={(value) => {
                setEndsDate(value);
                setEndsTouched(true);
              }}
            />
            <Input
              id="event-ends-time"
              class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/45"
              inputMode="numeric"
              placeholder="10:00"
              pattern="[0-2][0-9]:[0-5][0-9]"
              value={endsTime()}
              aria-label={t("exams.endTime")}
              onInput={(e) => {
                setEndsTime(e.currentTarget.value);
                setEndsTouched(true);
              }}
            />
          </div>
          <Show when={isEdit && endsTouched() && !endsDate() && !endsTime()}>
            <p class="text-xs text-muted-foreground">{t("events.clearEnd")}</p>
          </Show>
        </div>
      </div>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" class="h-10" disabled={pending()}>
          {props.submitLabel ?? t("common.save")}
        </Button>
        {props.onCancel && (
          <Button type="button" variant="outline" class="h-10" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
    <ConfirmDialog
      open={confirmOpen()}
      onOpenChange={setConfirmOpen}
      title={t("confirm.updateTitle")}
      summary={t("confirm.updateEvent", { title: pendingValues()?.title ?? "" })}
      onConfirm={async () => {
        const values = pendingValues();
        if (!values) return;
        await save(values);
      }}
    />
    </>
  );
}
