import { createEffect, createMemo, createResource, createSignal, Show } from "solid-js";
import { formatApiError } from "@/api/client";
import { For } from "solid-js";
import { getSettings } from "@/api/settings";
import { getTime } from "@/api/time";
import type { Exam } from "@/api/client";
import { EXAM_KINDS, EXAM_MODES } from "@/api/client";
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
  draft: boolean;
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
  const [mode, setMode] = createSignal(props.initial?.mode && props.initial.mode !== "" ? props.initial.mode : "open");
  const [hasRetakes, setHasRetakes] = createSignal((props.initial?.max_attempts ?? 1) !== 1);
  const [maxAttempts, setMaxAttempts] = createSignal(String(props.initial?.max_attempts ?? 1));
  const [allowRejoin, setAllowRejoin] = createSignal(props.initial?.allow_rejoin ?? true);
  const [draft, setDraft] = createSignal(props.initial?.draft ?? false);
  const [startsDate, setStartsDate] = createSignal(dateInputFromMs(props.initial?.starts_at));
  const [startsTime, setStartsTime] = createSignal(timeInputFromMs(props.initial?.starts_at));
  const [endsDate, setEndsDate] = createSignal(dateInputFromMs(props.initial?.ends_at));
  const [endsTime, setEndsTime] = createSignal(timeInputFromMs(props.initial?.ends_at));

  const initialDurationMin = props.initial?.duration_ms
    ? String(Math.round(props.initial.duration_ms / 60000))
    : "";
  const [hasDuration, setHasDuration] = createSignal(props.initial?.duration_ms != null || props.initial?.mode === "async");
  const [durationMinutes, setDurationMinutes] = createSignal(initialDurationMin);

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
    if (hasDuration() || mode() === "async") {
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
        setMode("open");
        setHasRetakes(false);
        setMaxAttempts("1");
        setAllowRejoin(true);
        setDraft(false);
        setStartsDate("");
        setStartsTime("");
        setEndsDate("");
        setEndsTime("");
        setHasDuration(false);
        setDurationMinutes("");
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

    let duration_ms: number | null = null;
    if (hasDuration() && durationMinutes().trim() !== "") {
      const mins = Number(durationMinutes().trim());
      if (!Number.isNaN(mins) && mins > 0) {
        duration_ms = mins * 60 * 1000;
      }
    } else if (mode() === "async" && starts_at != null && ends_at != null) {
      duration_ms = ends_at - starts_at;
    }

    const v = validate(starts_at, ends_at, duration_ms);
    if (v) {
      setError(v);
      return;
    }
    const values = {
      title: title().trim(),
      description: description(),
      kind: kind(),
      mode: mode(),
      starts_at,
      ends_at,
      duration_ms,
      max_attempts: hasRetakes() ? Number(maxAttempts()) : 1,
      allow_rejoin: allowRejoin(),
      draft: draft(),
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
      <form class="space-y-4" onSubmit={handleSubmit}>
        {/* Section 1: Basic Info */}
        <div class="space-y-3 rounded-2xl border border-sky-500/15 bg-sky-500/[0.03] p-4 shadow-sm">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("exams.sectionBasic")}</h3>
          <div class="space-y-1.5">
            <Label for="exam-title">{t("form.title")}</Label>
            <Input
              id="exam-title"
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
              value={kind()}
              onChange={(e) => setKind(e.currentTarget.value)}
            >
              <For each={examKinds()}>{(k) => <option value={k}>{examKindLabel(k, t)}</option>}</For>
            </Select>
          </div>
        </div>

        {/* Section 2: Mode & Schedule */}
        <div class="space-y-3 rounded-2xl border border-amber-500/15 bg-amber-500/[0.03] p-4 shadow-sm">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("exams.sectionSchedule")}</h3>
          <div class="space-y-1.5">
            <Label for="exam-mode">{t("exams.mode")}</Label>
            <Select
              id="exam-mode"
              value={mode()}
              onChange={(e) => {
                const next = e.currentTarget.value;
                setMode(next);
                if (next === "async") setHasDuration(true);
              }}
            >
              <For each={EXAM_MODES}>
                {(m) => (
                  <option value={m}>
                    {m === "sync" ? t("exams.mode.sync") : m === "async" ? t("exams.mode.async") : t("exams.mode.open")}
                  </option>
                )}
              </For>
            </Select>
          </div>

          <Show when={mode() === "sync" || mode() === "async"}>
            <div class="grid gap-3 pt-1">
              <div class="space-y-1.5">
                <Label for="exam-starts">{t("events.starts")}</Label>
                <div class="grid grid-cols-2 gap-2">
                  <DatePicker
                    id="exam-starts"
                    class="h-11"
                    placeholder={t("form.datePlaceholder")}
                    value={startsDate()}
                    required
                    onChange={setStartsDate}
                  />
                  <Input
                    id="exam-starts-time"
                    class="h-11 font-mono placeholder:text-muted-foreground/45"
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
                    class="h-11"
                    placeholder={t("form.datePlaceholder")}
                    value={endsDate()}
                    required
                    onChange={setEndsDate}
                  />
                  <Input
                    id="exam-ends-time"
                    class="h-11 font-mono placeholder:text-muted-foreground/45"
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
        </div>

        {/* Section 3: Time Limit / Duration */}
        <div class="space-y-3 rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.03] p-4 shadow-sm">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("exams.sectionDuration")}</h3>
          <label class="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-border"
              checked={hasDuration()}
              onChange={(e) => setHasDuration(e.currentTarget.checked)}
            />
            <span>{t("exams.hasDuration")}</span>
          </label>
          <p class="text-xs text-muted-foreground">{t("exams.hasDurationHelp")}</p>
          <Show when={hasDuration()}>
            <div class="pt-1">
              <Label for="exam-duration">{t("exams.durationMinutes")}</Label>
              <Input
                id="exam-duration"
                type="number"
                min={1}
                max={1440}
                class="mt-1.5 h-11 bg-background/60"
                placeholder="60"
                value={durationMinutes()}
                onInput={(e) => setDurationMinutes(e.currentTarget.value)}
              />
            </div>
          </Show>
        </div>

        {/* Section 4: Participation & Attempts */}
        <div class="space-y-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4 shadow-sm">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("exams.sectionAccess")}</h3>

          <div class="rounded-xl border bg-background/60 px-3 py-2">
            <label class="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-border"
                checked={hasRetakes()}
                onChange={(e) => {
                  setHasRetakes(e.currentTarget.checked);
                  if (e.currentTarget.checked && maxAttempts() === "1") setMaxAttempts("2");
                }}
              />
              <div>
                <span class="font-medium">{t("exams.retakes")}</span>
                <p class="text-xs font-normal text-muted-foreground">{t("exams.retakesHelp")}</p>
              </div>
            </label>
            <Show when={hasRetakes()}>
              <div class="ml-6 mt-2 flex items-center gap-2">
                <Input
                  id="exam-max-attempts"
                  class="h-10 w-20 text-center"
                  type="number"
                  min={1}
                  step={1}
                  value={maxAttempts()}
                  required
                  onInput={(e) => setMaxAttempts(e.currentTarget.value)}
                />
                <span class="text-xs text-muted-foreground">{t("exams.times")}</span>
              </div>
            </Show>
          </div>

          <label class="flex items-start gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              checked={allowRejoin()}
              onChange={(e) => setAllowRejoin(e.currentTarget.checked)}
            />
            <div>
              <span class="font-medium">{t("exams.allowRejoin")}</span>
              <p class="text-xs font-normal text-muted-foreground">{t("exams.allowRejoinHelp")}</p>
            </div>
          </label>

          <label class="flex items-start gap-2 rounded-xl border bg-background/60 px-3 py-2 text-sm">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              checked={draft()}
              onChange={(e) => setDraft(e.currentTarget.checked)}
            />
            <div>
              <span class="font-medium">{t("exams.draft")}</span>
              <p class="text-xs font-normal text-muted-foreground">{t("exams.draftHelp")}</p>
            </div>
          </label>
        </div>

        {error() && <p class="text-sm text-destructive">{error()}</p>}

        <div class="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-2 border-t border-border bg-background px-5 pb-6 pt-4 sm:-mx-6 sm:px-6 sm:pb-6">
          <Button type="submit" class="flex-1 sm:flex-none" disabled={pending()}>
            {props.submitLabel ?? t("common.save")}
          </Button>
          {props.onCancel && (
            <Button type="button" variant="outline" class="flex-1 sm:flex-none" onClick={props.onCancel}>
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
