import { createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import { For } from "solid-js";
import type { Exam } from "@/api/types";
import { EXAM_KINDS, EXAM_MODES } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconSave } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { examKindLabel } from "@/lib/exam-labels";
import { dateTimeTextToMs, msToDateTimeText } from "@/lib/format";
import { useT } from "@/stores/preferences-context";

const UI_EXAM_KINDS = EXAM_KINDS.filter((kind) => kind !== "homework");

function datePart(value: string): string {
  return value.split(" ")[0] ?? "";
}

function timePart(value: string): string {
  return value.split(" ")[1] ?? "";
}

function withDate(value: string, date: string): string {
  const time = timePart(value);
  return time ? `${date} ${time}` : date;
}

function withTime(value: string, time: string): string {
  const date = datePart(value);
  return date ? `${date} ${time}` : time;
}

export type ExamFormValues = {
  title: string;
  description: string;
  kind: string;
  weight: number;
  mode: string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
};

export function ExamForm(props: {
  initial?: Partial<Exam>;
  submitLabel?: string;
  onSubmit: (values: ExamFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useT();
  const [title, setTitle] = createSignal(props.initial?.title ?? "");
  const [description, setDescription] = createSignal(props.initial?.description ?? "");
  const [kind, setKind] = createSignal(String(props.initial?.kind && props.initial.kind !== "homework" ? props.initial.kind : "quiz"));
  const [weight, setWeight] = createSignal(String(props.initial?.weight ?? 1));
  const [mode, setMode] = createSignal(String(props.initial?.mode ?? ""));
  const [startsText, setStartsText] = createSignal(msToDateTimeText(props.initial?.starts_at));
  const [endsText, setEndsText] = createSignal(msToDateTimeText(props.initial?.ends_at));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<ExamFormValues | null>(null);
  const isEdit = () => !!props.initial?.id;

  const validate = (starts: number | null, ends: number | null, durationMs: number | null): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (description().length > 2000) return t("form.descriptionMax");
    const w = Number(weight());
    if (!Number.isInteger(w) || w < 1 || w > 100) return t("form.weightRange");
    if (mode()) {
      if (starts == null || ends == null) return t("exams.scheduleRequired");
      if (ends <= starts) return t("form.timeOrder");
      if (mode() === "async") {
        if (durationMs == null) return t("exams.durationRequired");
        if (!Number.isFinite(durationMs) || durationMs < 60_000 || durationMs > 86_400_000) {
          return t("exams.durationRange");
        }
      }
    }
    return null;
  };

  const save = async (values: ExamFormValues) => {
    setError("");
    setPending(true);
    try {
      await props.onSubmit(values);
      if (!isEdit()) {
        setTitle("");
        setDescription("");
        setKind("quiz");
        setWeight("1");
        setMode("");
        setStartsText("");
        setEndsText("");
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = mode() ? dateTimeTextToMs(startsText()) : null;
    const ends_at = mode() ? dateTimeTextToMs(endsText()) : null;
    const duration_ms = mode() === "async" && starts_at != null && ends_at != null ? ends_at - starts_at : null;
    const v = validate(starts_at, ends_at, duration_ms);
    if (v) {
      setError(v);
      return;
    }
    const values = {
      title: title().trim(),
      description: description(),
      kind: kind(),
      weight: Number(weight()),
      mode: mode() || null,
      starts_at,
      ends_at,
      duration_ms,
    };
    if (isEdit()) {
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
        <Label for="exam-title">{t("form.title")}</Label>
        <Input
          id="exam-title"
          class="rounded-sm"
          value={title()}
          maxlength={200}
          required
          onInput={(e) => setTitle(e.currentTarget.value)}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="exam-description">{t("form.description")}</Label>
        <Textarea
          id="exam-description"
          class="rounded-sm"
          value={description()}
          maxlength={2000}
          rows={3}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
      </div>
      <div class="space-y-1.5">
        <Label for="exam-kind">{t("exams.kind")}</Label>
        <Select
          id="exam-kind"
          class="rounded-sm"
          value={kind()}
          onChange={(e) => setKind(e.currentTarget.value)}
        >
          <For each={UI_EXAM_KINDS}>{(k) => <option value={k}>{examKindLabel(k, t)}</option>}</For>
        </Select>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="exam-weight">{t("courses.weight")}</Label>
          <Input
            id="exam-weight"
            class="rounded-sm"
            type="number"
            min={1}
            max={100}
            value={weight()}
            required
            onInput={(e) => setWeight(e.currentTarget.value)}
          />
        </div>
        <div class="space-y-1.5">
          <Label for="exam-mode">{t("exams.mode")}</Label>
          <Select
            id="exam-mode"
            class="rounded-sm"
            value={mode()}
            onChange={(e) => setMode(e.currentTarget.value)}
          >
            <option value="">{t("exams.mode.unscheduled")}</option>
            <For each={EXAM_MODES}>
              {(m) => <option value={m}>{m === "sync" ? t("exams.mode.sync") : t("exams.mode.async")}</option>}
            </For>
          </Select>
        </div>
      </div>
      <Show when={mode()}>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="exam-starts">{t("events.starts")}</Label>
            <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <Input
                id="exam-starts"
                class="rounded-sm"
                type="date"
                value={datePart(startsText())}
                required
                onInput={(e) => setStartsText(withDate(startsText(), e.currentTarget.value))}
              />
              <Input
                class="rounded-sm font-mono"
                value={timePart(startsText())}
                placeholder="14:30"
                required
                pattern="[0-2][0-9]:[0-5][0-9]"
                onInput={(e) => setStartsText(withTime(startsText(), e.currentTarget.value))}
              />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="exam-ends">{t("events.ends")}</Label>
            <div class="grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
              <Input
                id="exam-ends"
                class="rounded-sm"
                type="date"
                value={datePart(endsText())}
                required
                onInput={(e) => setEndsText(withDate(endsText(), e.currentTarget.value))}
              />
              <Input
                class="rounded-sm font-mono"
                value={timePart(endsText())}
                placeholder="15:30"
                required
                pattern="[0-2][0-9]:[0-5][0-9]"
                onInput={(e) => setEndsText(withTime(endsText(), e.currentTarget.value))}
              />
            </div>
          </div>
        </div>
      </Show>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending()}>
          <IconSave />
          {props.submitLabel ?? t("common.save")}
        </Button>
        {props.onCancel && (
          <Button type="button" variant="outline" onClick={props.onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
    <ConfirmDialog
      open={confirmOpen()}
      onOpenChange={setConfirmOpen}
      title={t("confirm.updateTitle")}
      summary={t("confirm.updateExam", { title: pendingValues()?.title ?? "" })}
      onConfirm={async () => {
        const values = pendingValues();
        if (!values) return;
        await save(values);
      }}
    />
    </>
  );
}
