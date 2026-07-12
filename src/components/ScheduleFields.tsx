// The scheduling block shared by the exam create and edit forms: a mode
// picker in plain words, the window, and — for flexible exams — the
// per-student time budget. Unscheduled stays the quiet default.

import { Show, createSignal } from "solid-js";
import { fromInputValue, toInputValue } from "../lib/format";
import { t } from "../lib/i18n";
import { LIMITS, type Exam, type ExamMode } from "../lib/types";

/** Read the schedule unit out of a submitted form (all-null when untimed). */
export function scheduleFromForm(data: FormData): {
  mode: string | null;
  starts_at: number | null;
  ends_at: number | null;
  duration_ms: number | null;
} {
  const mode = String(data.get("mode") ?? "");
  if (mode === "") {
    return { mode: null, starts_at: null, ends_at: null, duration_ms: null };
  }
  return {
    mode,
    starts_at: fromInputValue(String(data.get("starts_at") ?? "")),
    ends_at: fromInputValue(String(data.get("ends_at") ?? "")),
    duration_ms:
      mode === "async" ? Number(data.get("duration_min")) * 60_000 : null,
  };
}

export function ScheduleFields(props: { exam?: Exam }) {
  const [mode, setMode] = createSignal<"" | ExamMode>(props.exam?.mode ?? "");
  let starts!: HTMLInputElement;
  let ends!: HTMLInputElement;

  // "YYYY-MM-DDTHH:mm" compares chronologically as a string, so the browser
  // can refuse a window that ends before it starts — before the server does.
  const checkOrder = () => {
    ends.setCustomValidity(
      starts.value && ends.value && ends.value <= starts.value
        ? t("endsAfterStarts")
        : "",
    );
  };

  return (
    <div class="stack">
      <label>
        {t("timing")}
        <select
          name="mode"
          value={mode()}
          onChange={(e) => setMode(e.currentTarget.value as "" | ExamMode)}
        >
          <option value="">{t("timingNone")}</option>
          <option value="sync">{t("timingSync")}</option>
          <option value="async">{t("timingAsync")}</option>
        </select>
      </label>
      <Show when={mode()}>
        <div class="row">
          <label>
            {t("opens")}
            <input
              ref={starts}
              name="starts_at"
              type="datetime-local"
              required
              value={toInputValue(props.exam?.starts_at ?? null)}
              onInput={checkOrder}
            />
          </label>
          <label>
            {t("closes")}
            <input
              ref={ends}
              name="ends_at"
              type="datetime-local"
              required
              value={toInputValue(props.exam?.ends_at ?? null)}
              onInput={checkOrder}
            />
          </label>
          <Show when={mode() === "async"}>
            <label>
              {t("minutesPerStudent")}
              <input
                name="duration_min"
                type="number"
                required
                min={LIMITS.examDurationMin.min}
                max={LIMITS.examDurationMin.max}
                value={
                  props.exam?.duration_ms
                    ? Math.round(props.exam.duration_ms / 60_000)
                    : 40
                }
              />
            </label>
          </Show>
        </div>
        <p class="hint">{mode() === "sync" ? t("syncHint") : t("asyncHint")}</p>
      </Show>
    </div>
  );
}
