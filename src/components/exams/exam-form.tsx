import { createEffect, createSignal, Show } from "solid-js";
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
import { localPartsToMs, msToLocalDate, msToLocalHour, msToLocalMinute } from "@/lib/format";
import { useT } from "@/stores/preferences-context";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 51 }, (_, i) => String(new Date().getFullYear() - 10 + i));

function datePart(date: string, index: number): string {
  return date.split("-")[index] ?? "";
}

function withDatePart(date: string, index: number, value: string): string {
  const parts = date.split("-");
  const normalized = [parts[0] ?? "", parts[1] ?? "", parts[2] ?? ""];
  normalized[index] = value;
  return normalized.every(Boolean) ? normalized.join("-") : normalized.filter(Boolean).join("-");
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
  const [kind, setKind] = createSignal(String(props.initial?.kind ?? "homework"));
  const [weight, setWeight] = createSignal(String(props.initial?.weight ?? 1));
  const [mode, setMode] = createSignal(String(props.initial?.mode ?? ""));
  const [startsDate, setStartsDate] = createSignal(msToLocalDate(props.initial?.starts_at));
  const [startsHour, setStartsHour] = createSignal(msToLocalHour(props.initial?.starts_at));
  const [startsMinute, setStartsMinute] = createSignal(msToLocalMinute(props.initial?.starts_at));
  const [endsDate, setEndsDate] = createSignal(msToLocalDate(props.initial?.ends_at));
  const [endsHour, setEndsHour] = createSignal(msToLocalHour(props.initial?.ends_at));
  const [endsMinute, setEndsMinute] = createSignal(msToLocalMinute(props.initial?.ends_at));
  const [durationMinutes, setDurationMinutes] = createSignal(
    props.initial?.duration_ms ? String(Math.round(props.initial.duration_ms / 60_000)) : "",
  );
  const [durationTouched, setDurationTouched] = createSignal(false);
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<ExamFormValues | null>(null);
  const isEdit = () => !!props.initial?.id;

  createEffect(() => {
    if (mode() !== "async" || durationTouched()) return;
    const starts = localPartsToMs(startsDate(), startsHour(), startsMinute());
    const ends = localPartsToMs(endsDate(), endsHour(), endsMinute());
    if (starts == null || ends == null || ends <= starts) return;
    setDurationMinutes(String(Math.min(1440, Math.max(1, Math.round((ends - starts) / 60_000)))));
  });

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
        setKind("homework");
        setWeight("1");
        setMode("");
        setStartsDate("");
        setStartsHour("");
        setStartsMinute("");
        setEndsDate("");
        setEndsHour("");
        setEndsMinute("");
        setDurationMinutes("");
        setDurationTouched(false);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const starts_at = mode() ? localPartsToMs(startsDate(), startsHour(), startsMinute()) : null;
    const ends_at = mode() ? localPartsToMs(endsDate(), endsHour(), endsMinute()) : null;
    const duration_ms = mode() === "async" && durationMinutes() ? Number(durationMinutes()) * 60_000 : null;
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
          <For each={EXAM_KINDS}>{(k) => <option value={k}>{k}</option>}</For>
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
            <div class="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem_4.5rem] gap-2">
              <Select id="exam-starts" value={datePart(startsDate(), 0)} required onChange={(e) => setStartsDate(withDatePart(startsDate(), 0, e.currentTarget.value))}>
                <option value="">{t("form.year")}</option>
                <For each={YEARS}>{(y) => <option value={y}>{y}</option>}</For>
              </Select>
              <Select value={datePart(startsDate(), 1)} required onChange={(e) => setStartsDate(withDatePart(startsDate(), 1, e.currentTarget.value))}>
                <option value="">{t("form.month")}</option>
                <For each={MONTHS}>{(m) => <option value={m}>{m}</option>}</For>
              </Select>
              <Select value={datePart(startsDate(), 2)} required onChange={(e) => setStartsDate(withDatePart(startsDate(), 2, e.currentTarget.value))}>
                <option value="">{t("form.day")}</option>
                <For each={DAYS}>{(d) => <option value={d}>{d}</option>}</For>
              </Select>
              <Select value={startsHour()} required onChange={(e) => setStartsHour(e.currentTarget.value)}>
                <option value="">HH</option>
                <For each={HOURS}>{(h) => <option value={h}>{h}</option>}</For>
              </Select>
              <Select value={startsMinute()} required onChange={(e) => setStartsMinute(e.currentTarget.value)}>
                <option value="">MM</option>
                <For each={MINUTES}>{(m) => <option value={m}>{m}</option>}</For>
              </Select>
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="exam-ends">{t("events.ends")}</Label>
            <div class="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem_4.5rem] gap-2">
              <Select id="exam-ends" value={datePart(endsDate(), 0)} required onChange={(e) => setEndsDate(withDatePart(endsDate(), 0, e.currentTarget.value))}>
                <option value="">{t("form.year")}</option>
                <For each={YEARS}>{(y) => <option value={y}>{y}</option>}</For>
              </Select>
              <Select value={datePart(endsDate(), 1)} required onChange={(e) => setEndsDate(withDatePart(endsDate(), 1, e.currentTarget.value))}>
                <option value="">{t("form.month")}</option>
                <For each={MONTHS}>{(m) => <option value={m}>{m}</option>}</For>
              </Select>
              <Select value={datePart(endsDate(), 2)} required onChange={(e) => setEndsDate(withDatePart(endsDate(), 2, e.currentTarget.value))}>
                <option value="">{t("form.day")}</option>
                <For each={DAYS}>{(d) => <option value={d}>{d}</option>}</For>
              </Select>
              <Select value={endsHour()} required onChange={(e) => setEndsHour(e.currentTarget.value)}>
                <option value="">HH</option>
                <For each={HOURS}>{(h) => <option value={h}>{h}</option>}</For>
              </Select>
              <Select value={endsMinute()} required onChange={(e) => setEndsMinute(e.currentTarget.value)}>
                <option value="">MM</option>
                <For each={MINUTES}>{(m) => <option value={m}>{m}</option>}</For>
              </Select>
            </div>
          </div>
          <Show when={mode() === "async"}>
            <div class="space-y-1.5">
              <Label for="exam-duration">{t("exams.durationMinutes")}</Label>
              <Input
                id="exam-duration"
                class="rounded-sm"
                type="number"
                min={1}
                max={1440}
                value={durationMinutes()}
                required
                onInput={(e) => {
                  setDurationTouched(true);
                  setDurationMinutes(e.currentTarget.value);
                }}
              />
            </div>
          </Show>
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
