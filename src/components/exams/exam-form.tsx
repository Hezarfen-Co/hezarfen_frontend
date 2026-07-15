import { createEffect, createMemo, createResource, createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import { For } from "solid-js";
import { getSettings } from "@/api/getSettings";
import { getTime } from "@/api/getTime";
import type { Exam } from "@/api/types";
import { EXAM_KINDS, EXAM_MODES } from "@/api/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { examKindLabel } from "@/lib/exam-labels";
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

function scheduleInputToMs(date: string, time: string): number | null {
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
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day ||
    d.getHours() !== hour ||
    d.getMinutes() !== minute
  ) {
    return null;
  }
  return d.getTime();
}

export type ExamFormValues = {
  title: string;
  description: string;
  kind: string;
  mode: string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
  max_attempts: number;
  allow_rejoin: boolean;
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
  const [kind, setKind] = createSignal(String(props.initial?.kind ?? "quiz"));
  const [mode, setMode] = createSignal(String(props.initial?.mode ?? ""));
  const [hasRetakes, setHasRetakes] = createSignal((props.initial?.max_attempts ?? 1) !== 1);
  const [maxAttempts, setMaxAttempts] = createSignal(String(props.initial?.max_attempts ?? 1));
  const [allowRejoin, setAllowRejoin] = createSignal(props.initial?.allow_rejoin ?? true);
  const [startsDate, setStartsDate] = createSignal(dateInputFromMs(props.initial?.starts_at));
  const [startsTime, setStartsTime] = createSignal(timeInputFromMs(props.initial?.starts_at));
  const [endsDate, setEndsDate] = createSignal(dateInputFromMs(props.initial?.ends_at));
  const [endsTime, setEndsTime] = createSignal(timeInputFromMs(props.initial?.ends_at));
  const [error, setError] = createSignal("");
  const [pending, setPending] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [pendingValues, setPendingValues] = createSignal<ExamFormValues | null>(null);
  const isEdit = () => !!props.initial?.id;
  const [settings] = createResource(() => getSettings());
  const [serverTime] = createResource(() => getTime().catch(() => ({ now: Date.now() })));
  const examKinds = createMemo(() => {
    const names = settings()?.exam_kinds.map((item) => item.name) ?? EXAM_KINDS;
    return names.includes(kind()) ? names : [kind(), ...names];
  });

  createEffect(() => {
    if (isEdit()) return;
    const names = settings()?.exam_kinds.map((item) => item.name) ?? [];
    if (names.length > 0 && !names.includes(kind())) setKind(names[0]);
  });

  const validate = (starts: number | null, ends: number | null, duration: number | null): string | null => {
    const value = title().trim();
    if (!value) return t("form.titleRequired");
    if (value.length > 200) return t("form.titleMax");
    if (description().length > 2000) return t("form.descriptionMax");
    const attempts = hasRetakes() ? Number(maxAttempts()) : 1;
    if (!Number.isInteger(attempts) || attempts < 1) return t("exams.maxAttemptsRange");
    if (mode() === "sync" || mode() === "async") {
      if (starts == null || ends == null) return t("exams.scheduleRequired");
      if (ends <= starts) return t("form.timeOrder");
      if (!isEdit() && (starts < (serverTime()?.now ?? Date.now()) || ends < (serverTime()?.now ?? Date.now()))) return t("form.timePast");
    }
    if (mode() === "async") {
      if (duration == null) return t("exams.durationRequired");
      if (duration < 60000 || duration > 86400000) return t("exams.durationRange");
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
        setKind(settings()?.exam_kinds[0]?.name ?? "quiz");
        setMode("");
        setHasRetakes(false);
        setMaxAttempts("1");
        setAllowRejoin(true);
        setStartsDate("");
        setStartsTime("");
        setEndsDate("");
        setEndsTime("");
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const hasWindow = mode() === "sync" || mode() === "async";
    const starts_at = hasWindow ? scheduleInputToMs(startsDate(), startsTime()) : null;
    const ends_at = hasWindow ? scheduleInputToMs(endsDate(), endsTime()) : null;
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
      mode: mode() || null,
      starts_at,
      ends_at,
      duration_ms,
      max_attempts: hasRetakes() ? Number(maxAttempts()) : 1,
      allow_rejoin: allowRejoin(),
    } satisfies ExamFormValues;
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
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <Label for="exam-kind">{t("exams.kind")}</Label>
          <Select
            id="exam-kind"
            class="rounded-sm"
            value={kind()}
            onChange={(e) => setKind(e.currentTarget.value)}
          >
            <For each={examKinds()}>{(k) => <option value={k}>{examKindLabel(k, t)}</option>}</For>
          </Select>
        </div>
        <div class="space-y-1.5">
          <Label for="exam-mode">{t("exams.mode")}</Label>
          <Select id="exam-mode" class="rounded-sm" value={mode()} onChange={(e) => setMode(e.currentTarget.value)}>
            <option value="">{t("exams.mode.unscheduled")}</option>
            <For each={EXAM_MODES}>
              {(m) => (
                <option value={m}>
                  {m === "sync" ? t("exams.mode.sync") : m === "async" ? t("exams.mode.async") : t("exams.mode.open")}
                </option>
              )}
            </For>
          </Select>
        </div>
      </div>
      <div class="grid items-end gap-3 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="flex h-10 items-center gap-2 rounded-sm border bg-background/60 px-3 text-sm">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              checked={hasRetakes()}
              onChange={(e) => {
                setHasRetakes(e.currentTarget.checked);
                if (e.currentTarget.checked && maxAttempts() === "1") setMaxAttempts("2");
              }}
            />
            <span>{t("exams.retakes")}</span>
          </label>
        </div>
        <Show when={hasRetakes()}>
          <div class="space-y-1.5">
            <Label for="exam-max-attempts">{t("exams.maxAttempts")}</Label>
            <Input
              id="exam-max-attempts"
              class="h-10 rounded-sm bg-background/60"
              type="number"
              min={1}
              step={1}
              value={maxAttempts()}
              required
              onInput={(e) => setMaxAttempts(e.currentTarget.value)}
            />
          </div>
        </Show>
      </div>
      <div class="space-y-1.5">
        <label class="flex h-10 items-center gap-2 rounded-sm border bg-background/60 px-3 text-sm">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-border"
            checked={allowRejoin()}
            onChange={(e) => setAllowRejoin(e.currentTarget.checked)}
          />
          <span>{t("exams.allowRejoin")}</span>
        </label>
        <p class="text-xs text-muted-foreground">{t("exams.allowRejoinHelp")}</p>
      </div>
      <Show when={mode() === "sync" || mode() === "async"}>
        <div class="grid gap-3">
          <div class="space-y-1.5">
            <Label for="exam-starts">{t("events.starts")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker
                id="exam-starts"
                class="h-10"
                placeholder={t("form.datePlaceholder")}
                value={startsDate()}
                required
                onChange={setStartsDate}
              />
              <Input
                id="exam-starts-time"
                class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/45"
                inputMode="numeric"
                placeholder="14:30"
                pattern="[0-2][0-9]:[0-5][0-9]"
                value={startsTime()}
                required
                aria-label={t("exams.startTime")}
                onInput={(e) => setStartsTime(e.currentTarget.value)}
              />
            </div>
          </div>
          <div class="space-y-1.5">
            <Label for="exam-ends">{t("events.ends")}</Label>
            <div class="grid grid-cols-2 gap-2">
              <DatePicker
                id="exam-ends"
                class="h-10"
                placeholder={t("form.datePlaceholder")}
                value={endsDate()}
                required
                onChange={setEndsDate}
              />
              <Input
                id="exam-ends-time"
                class="h-10 rounded-sm font-mono placeholder:text-muted-foreground/45"
                inputMode="numeric"
                placeholder="15:30"
                pattern="[0-2][0-9]:[0-5][0-9]"
                value={endsTime()}
                required
                aria-label={t("exams.endTime")}
                onInput={(e) => setEndsTime(e.currentTarget.value)}
              />
            </div>
          </div>
        </div>
      </Show>
      {error() && <p class="text-sm text-destructive">{error()}</p>}
      <div class="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending()}>
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
