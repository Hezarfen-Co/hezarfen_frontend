import { createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import type { Event } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconSave } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { localInputToMs, msToLocalInput } from "@/lib/format";
import { useT } from "@/stores/preferences-context";

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
  const [startsLocal, setStartsLocal] = createSignal(msToLocalInput(props.initial?.starts_at));
  const [endsLocal, setEndsLocal] = createSignal(msToLocalInput(props.initial?.ends_at));
  const [startsTouched, setStartsTouched] = createSignal(false);
  const [endsTouched, setEndsTouched] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<EventFormValues | null>(null);

  const resolveTime = (local: string, touched: boolean): number | null | undefined => {
    if (isEdit && !touched) return undefined;
    return localInputToMs(local);
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
        setStartsLocal("");
        setEndsLocal("");
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
    const starts_at = resolveTime(startsLocal(), startsTouched());
    const ends_at = resolveTime(endsLocal(), endsTouched());
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
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="event-starts">{t("events.starts")}</Label>
          <Input
            id="event-starts"
            class="h-10 rounded-sm"
            type="datetime-local"
            value={startsLocal()}
            onInput={(e) => {
              setStartsLocal(e.currentTarget.value);
              setStartsTouched(true);
            }}
          />
          <Show when={isEdit && startsTouched() && !startsLocal()}>
            <p class="text-xs text-muted-foreground">{t("events.clearStart")}</p>
          </Show>
        </div>
        <div class="space-y-1.5">
          <Label for="event-ends">{t("events.ends")}</Label>
          <Input
            id="event-ends"
            class="h-10 rounded-sm"
            type="datetime-local"
            value={endsLocal()}
            onInput={(e) => {
              setEndsLocal(e.currentTarget.value);
              setEndsTouched(true);
            }}
          />
          <Show when={isEdit && endsTouched() && !endsLocal()}>
            <p class="text-xs text-muted-foreground">{t("events.clearEnd")}</p>
          </Show>
        </div>
      </div>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" class="h-10" disabled={pending()}>
          <IconSave />
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
