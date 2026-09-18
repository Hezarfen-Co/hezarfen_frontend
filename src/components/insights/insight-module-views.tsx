import { For, Show, type JSX } from "solid-js";
import { Badge } from "@/components/ui/badge";
import { detailText, type InsightDetailKey } from "@/i18n/insights-detail";
import type { Locale } from "@/i18n/messages";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { isRecord, type UnknownRecord } from "@/lib/is-record";
import { usePreferences } from "@/stores/preferences-context";

/**
 * Human-readable renderers for one ZEKA insight module.
 *
 * The payload the drawer receives is ZEKA's own shape, stored and served
 * unread (`student_profile()` in the service's `compute/*.py`): dicts keyed by
 * course id, snake_case field names and honest Turkish `reason`/`limitation`
 * sentences for everything the service could not compute. Rendering that with
 * a generic key walker is what made the drawer unreadable — `Class es`,
 * `Trend Available` and a raw course uuid in a 5rem column.
 *
 * So each module gets its own renderer: labels come from the drawer's own
 * dictionary, course/class ids are resolved to titles, ratios are formatted as
 * percents and milliseconds as durations, and a `reason` is rendered as the
 * sentence it already is. Nothing is hidden: the caller keeps the whole payload
 * in a collapsed technical disclosure underneath.
 */

type Rec = UnknownRecord;
type CourseTitle = (id: string) => string | null;

/** A payload member as a record: a missing or non-object member reads as an
 *  empty one, so every field below renders as "—" instead of throwing. */
const obj = (value: unknown): Rec => (isRecord(value) ? value : {});

const str = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const n1 = (value: number) => value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
/** A nullable number as display text — the shape most payload fields arrive in. */
const nText = (value: unknown) => {
  const x = num(value);
  return x === null ? null : n1(x);
};
const pct = (value: unknown) => {
  const x = num(value);
  return x === null ? null : `%${Math.round(x * 100)}`;
};
/** A signed number in percentage points, for `relative_gap`-style differences. */
const points = (value: unknown) => {
  const x = num(value);
  return x === null ? null : `${x > 0 ? "+" : ""}${n1(x)} puan`;
};
/** The same, for a difference that is itself a rate (`relative_gap`): -0.16 is
 *  "-16 puan", not "-0,2 puan". */
const ratePoints = (value: unknown) => {
  const x = num(value);
  return x === null ? null : `${x > 0 ? "+" : ""}${n1(Math.round(x * 1000) / 10)} puan`;
};
const zText = (value: unknown) => {
  const x = num(value);
  return x === null ? null : x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
};
const durationText = (value: unknown) => {
  const ms = num(value);
  if (ms === null) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} dk`;
  return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
};
const hoursText = (value: unknown) => {
  const hours = num(value);
  return hours === null ? null : `${n1(Math.round(hours * 10) / 10)} saat`;
};

/** One label/value row. The value column takes the remaining width, so a long
 *  value wraps instead of squeezing the label into a broken column. */
export function LabeledRow(props: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div class="flex items-baseline justify-between gap-3 text-xs">
      <dt class="min-w-0 text-muted-foreground">{props.label}</dt>
      <dd
        class={cn(
          "min-w-0 text-right font-medium text-foreground",
          props.mono && "font-mono",
        )}
      >
        {props.value ?? detailText("detail.value.missing")}
      </dd>
    </div>
  );
}

/** A sentence the service wrote for something it could not compute, or a
 *  limitation line. Never a field dump. */
export function NoteLine(props: { label?: string; children: JSX.Element }) {
  return (
    <p class="text-[11px] leading-5 text-muted-foreground">
      <Show when={props.label}>
        <span class="font-medium">{props.label}: </span>
      </Show>
      {props.children}
    </p>
  );
}

function StatCell(props: { label: string; value: string | null }) {
  return (
    <div class="rounded-lg bg-surface-overlay px-2.5 py-2 text-center">
      <p class="font-mono text-sm font-semibold text-foreground">
        {props.value ?? detailText("detail.value.missing")}
      </p>
      <p class="mt-0.5 text-[10px] text-muted-foreground">{props.label}</p>
    </div>
  );
}

/** One course row resolved to its title: used by the attendance list, which
 *  carries no title of its own — the marks module keys the same course ids. */
function courseLabel(id: string, title: CourseTitle, index: number): string {
  return title(id) ?? detailText("marks.courseFallback", { n: index + 1 });
}

// ---------------------------------------------------------------------------
// attendance
// ---------------------------------------------------------------------------

function AttendanceView(props: { value: Rec; courseTitle: CourseTitle }) {
  const overall = () => obj(props.value.overall);
  const courses = () => Object.entries(obj(props.value.courses));

  return (
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2 @md:grid-cols-4">
        <StatCell label={detailText("attendance.rate")} value={pct(overall().rate)} />
        <StatCell label={detailText("attendance.present")} value={String(num(overall().present) ?? 0)} />
        <StatCell label={detailText("attendance.absent")} value={String(num(overall().absent) ?? 0)} />
        <StatCell label={detailText("attendance.late")} value={String(num(overall().late) ?? 0)} />
      </div>
      <dl class="space-y-1.5">
        <LabeledRow label={detailText("attendance.excused")} value={String(num(overall().excused) ?? 0)} mono />
        <LabeledRow label={detailText("attendance.nObs")} value={String(num(overall().n_obs) ?? 0)} mono />
        <LabeledRow
          label={detailText("attendance.relativeGap")}
          value={ratePoints(overall().relative_gap)}
          mono
        />
      </dl>
      <Show when={num(overall().rate) === null}>
        <NoteLine>{detailText("attendance.rateSuppressed")}</NoteLine>
      </Show>

      <Show
        when={courses().length > 0}
        fallback={<NoteLine>{detailText("attendance.coursesEmpty")}</NoteLine>}
      >
        <div class="max-h-80 space-y-2 overflow-y-auto pr-1">
          <For each={courses()}>
            {([id, raw], index) => {
              const stat = () => obj(raw);
              return (
                <div class="space-y-1.5 rounded-lg border border-border-hairline bg-surface-base p-3">
                  <p class="text-xs font-semibold text-text-strong">
                    {courseLabel(id, props.courseTitle, index())}
                  </p>
                  <dl class="space-y-1">
                    <LabeledRow label={detailText("attendance.rate")} value={pct(stat().rate)} mono />
                    <Show when={num(stat().rate) === null}>
                      <NoteLine>{detailText("attendance.rateSuppressed")}</NoteLine>
                    </Show>
                    <LabeledRow
                      label={detailText("attendance.present")}
                      value={String(num(stat().present) ?? 0)}
                      mono
                    />
                    <LabeledRow
                      label={detailText("attendance.absent")}
                      value={String(num(stat().absent) ?? 0)}
                      mono
                    />
                    <LabeledRow
                      label={detailText("attendance.late")}
                      value={String(num(stat().late) ?? 0)}
                      mono
                    />
                    <LabeledRow label={detailText("attendance.excused")} value={String(num(stat().excused) ?? 0)} mono />
                    <LabeledRow
                      label={detailText("attendance.cohortMedian")}
                      value={pct(stat().cohort_median)}
                      mono
                    />
                    <LabeledRow
                      label={detailText("attendance.cohortN")}
                      value={String(num(stat().cohort_n) ?? 0)}
                      mono
                    />
                    <LabeledRow
                      label={detailText("attendance.relativeGap")}
                      value={ratePoints(stat().relative_gap)}
                      mono
                    />
                  </dl>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      <dl class="space-y-1.5 border-t border-border-hairline pt-3">
        <LabeledRow label={detailText("attendance.weekdayPattern")} value={null} />
      </dl>
      <NoteLine label={detailText("detail.notComputed")}>
        {str(props.value.weekday_pattern_reason) ?? detailText("detail.value.missing")}
      </NoteLine>
      <NoteLine label={detailText("attendance.trend")}>
        {str(obj(props.value.trend).reason) ?? detailText("detail.value.missing")}
      </NoteLine>
      <Show when={str(props.value.limitation)}>
        {(value) => <NoteLine label={detailText("evidence.limitation")}>{value()}</NoteLine>}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// marks
// ---------------------------------------------------------------------------

const BAND_KEYS: Record<string, InsightDetailKey> = {
  review: "marks.band.review",
  on_track: "marks.band.on_track",
  strong: "marks.band.strong",
  insufficient_data: "marks.band.insufficient_data",
};

function MarksCourseCard(props: { id: string; statRaw: unknown; courseTitle: CourseTitle; index: number }) {
  const stat = () => obj(props.statRaw);
  const placement = () => obj(stat().placement);
  const trend = () => obj(stat().trend);
  const band = () => str(placement().band);
  const bandKey = (): InsightDetailKey => {
    const value = band();
    return (value === null ? undefined : BAND_KEYS[value]) ?? "marks.band.insufficient_data";
  };
  /** A real placement is one with a band other than "not enough data". */
  const placed = () => band() !== null && band() !== "insufficient_data";
  const bandVariant = () =>
    band() === "review" ? ("warning" as const) : band() === "strong" ? ("success" as const) : ("secondary" as const);

  return (
    <div class="space-y-2.5 rounded-lg border border-border-hairline bg-surface-base p-3">
      <p class="text-xs font-semibold text-text-strong">
        {str(stat().course_title) ?? courseLabel(props.id, props.courseTitle, props.index)}
      </p>
      <div class="grid grid-cols-2 gap-2 @md:grid-cols-4">
        <StatCell label={detailText("marks.average")} value={nText(stat().average)} />
        <StatCell label={detailText("marks.max")} value={nText(stat().max)} />
        <StatCell label={detailText("marks.min")} value={nText(stat().min)} />
        <StatCell label={detailText("marks.nMarks")} value={String(num(stat().n_marks) ?? 0)} />
      </div>
      <dl class="space-y-1">
        <LabeledRow label={detailText("marks.median")} value={nText(stat().median)} mono />
        <LabeledRow label={detailText("marks.mean")} value={nText(stat().mean)} mono />
      </dl>

      <dl class="space-y-1.5 border-t border-border-hairline pt-2.5">
        <div class="flex items-center justify-between gap-3">
          <dt class="text-xs text-muted-foreground">{detailText("marks.placement")}</dt>
          <dd>
            <Badge variant={bandVariant()} class="rounded-full">{detailText(bandKey())}</Badge>
          </dd>
        </div>
        <Show when={!placed()}>
          <div>
            <Show when={str(placement().progress)}>
              {(progress) => (
                <NoteLine>{detailText("marks.progress", { progress: progress() })}</NoteLine>
              )}
            </Show>
            {/* `reason` repeats the progress line verbatim when the gate is the
                mark count ("veri toplanıyor"); show the sentence only when it
                says something the progress line does not. */}
            <Show when={str(placement().reason)}>
              {(reason) => (
                <Show when={!str(placement().progress) || !reason().startsWith("veri toplanıyor")}>
                  <NoteLine>{reason()}</NoteLine>
                </Show>
              )}
            </Show>
          </div>
        </Show>
        <Show when={placed()}>
          <LabeledRow label={detailText("marks.classAverage")} value={nText(placement().class_average)} mono />
          <LabeledRow label={detailText("marks.classSd")} value={nText(placement().class_sd)} mono />
          <LabeledRow label={detailText("marks.cohortN")} value={String(num(placement().cohort_n) ?? 0)} mono />
          <LabeledRow label={detailText("marks.z")} value={zText(placement().z)} mono />
          <Show when={str(placement().reason)}>
            {(reason) => <NoteLine>{reason()}</NoteLine>}
          </Show>
        </Show>
      </dl>

      <div class="space-y-1.5 border-t border-border-hairline pt-2.5">
        <div class="flex items-center justify-between gap-3">
          <p class="text-xs text-muted-foreground">{detailText("marks.trend")}</p>
          <Show when={trend().available === true}>
            <div class="flex gap-1.5">
              <Show when={trend().dropped === true}>
                <Badge variant="warning" class="rounded-full">{detailText("marks.dropped")}</Badge>
              </Show>
              <Show when={trend().rising === true}>
                <Badge variant="success" class="rounded-full">{detailText("marks.rising")}</Badge>
              </Show>
            </div>
          </Show>
        </div>
        <Show
          when={trend().available === true}
          fallback={
            <div class="space-y-1">
              <NoteLine>{detailText("marks.band.insufficient_data")}</NoteLine>
              <Show when={str(trend().reason)}>{(reason) => <NoteLine>{reason()}</NoteLine>}</Show>
              <Show when={num(trend().n) !== null}>
                <LabeledRow label={detailText("marks.nMarks")} value={String(num(trend().n))} mono />
              </Show>
            </div>
          }
        >
          <dl class="space-y-1">
            <LabeledRow label={detailText("marks.recentMean")} value={nText(trend().recent_mean)} mono />
            <LabeledRow label={detailText("marks.previousMean")} value={nText(trend().previous_mean)} mono />
            <LabeledRow label={detailText("marks.trendDelta")} value={points(trend().delta)} mono />
            <Show when={num(trend().slope_per_30d) !== null}>
              <LabeledRow
                label={detailText("marks.trendSlope")}
                value={`${points(trend().slope_per_30d)} / 30 gün`}
                mono
              />
            </Show>
          </dl>
        </Show>
      </div>
    </div>
  );
}

function MarksView(props: { value: Rec; courseTitle: CourseTitle }) {
  const courses = () => Object.entries(obj(props.value.courses));
  const contrast = () => obj(props.value.within_student_contrast);
  const contrastTitle = () =>
    str(contrast().course_title) ??
    (str(contrast().course) ? props.courseTitle(contrast().course as string) : null);

  return (
    <div class="space-y-3">
      <dl class="space-y-1.5">
        <LabeledRow label={detailText("marks.classCount")} value={String((props.value.classes as unknown[] | undefined)?.length ?? 0)} mono />
      </dl>
      <div class="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        <For each={courses()}>
          {([id, stat], index) => (
            <MarksCourseCard id={id} statRaw={stat} courseTitle={props.courseTitle} index={index()} />
          )}
        </For>
      </div>

      <div class="space-y-1.5 border-t border-border-hairline pt-3">
        <p class="text-xs font-medium text-text-strong">{detailText("marks.contrast")}</p>
        <Show
          when={contrast().available === true}
          fallback={
            <div class="space-y-1">
              <NoteLine>{detailText("marks.band.insufficient_data")}</NoteLine>
              <Show when={str(contrast().reason)}>{(reason) => <NoteLine>{reason()}</NoteLine>}</Show>
            </div>
          }
        >
          <dl class="space-y-1">
            <LabeledRow label={detailText("marks.contrastWorst")} value={contrastTitle()} />
            <LabeledRow label={detailText("marks.contrastDelta")} value={zText(contrast().delta)} mono />
          </dl>
          <Show when={contrast().flagged === true}>
            <NoteLine>{detailText("marks.contrastFlagged")}</NoteLine>
          </Show>
        </Show>
      </div>

      <Show when={str(props.value.limitation)}>
        {(value) => <NoteLine label={detailText("evidence.limitation")}>{value()}</NoteLine>}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// study
// ---------------------------------------------------------------------------

function StudyWindow(props: { value: Rec }) {
  return (
    <div class="grid grid-cols-2 gap-2 @md:grid-cols-4">
      <StatCell label={detailText("study.stints")} value={String(num(props.value.n_stints) ?? 0)} />
      <StatCell label={detailText("study.activeDays")} value={String(num(props.value.active_days) ?? 0)} />
      <StatCell label={detailText("study.totalFocus")} value={durationText(props.value.total_focus_ms)} />
      <StatCell label={detailText("study.medianStint")} value={durationText(props.value.median_stint_ms)} />
    </div>
  );
}

function StudyView(props: { value: Rec }) {
  const recent = () => obj(props.value.recent_28d);
  const change = () => obj(props.value.change);
  return (
    <div class="space-y-3">
      <p class="text-xs font-medium text-text-strong">{detailText("study.recent")}</p>
      <StudyWindow value={recent()} />
      <dl class="space-y-1.5">
        <LabeledRow label={detailText("study.regularity")} value={pct(recent().regularity)} mono />
        <Show when={num(recent().regularity) === null}>
          <NoteLine>{detailText("study.regularitySuppressed")}</NoteLine>
        </Show>
        <LabeledRow label={detailText("study.burstiness")} value={nText(recent().burstiness)} mono />
        <LabeledRow label={detailText("study.nightShare")} value={pct(recent().night_share)} mono />
        <LabeledRow label={detailText("study.nightWindow")} value={str(recent().night_window_tr)} mono />
        <LabeledRow label={detailText("study.streak")} value={String(num(props.value.streak_local) ?? 0)} mono />
      </dl>
      <Show when={str(recent().burstiness_limitation)}>
        {(value) => <NoteLine label={detailText("evidence.burstinessLimitation")}>{value()}</NoteLine>}
      </Show>

      <div class="space-y-1.5 border-t border-border-hairline pt-3">
        <p class="text-xs font-medium text-text-strong">{detailText("study.change")}</p>
        <dl class="space-y-1">
          <LabeledRow
            label={detailText("study.changeActiveDays")}
            value={num(change().active_days_delta) === null ? null : `${num(change().active_days_delta)! > 0 ? "+" : ""}${num(change().active_days_delta)!} gün`}
            mono
          />
          <LabeledRow
            label={detailText("study.changeStints")}
            value={num(change().stints_delta) === null ? null : `${num(change().stints_delta)! > 0 ? "+" : ""}${num(change().stints_delta)!}`}
            mono
          />
          <LabeledRow label={detailText("study.changeFocus")} value={durationText(change().focus_ms_delta)} mono />
        </dl>
      </div>

      <div class="space-y-1.5 border-t border-border-hairline pt-3">
        <dl>
          <LabeledRow label={detailText("study.preDeadline")} value={pct(props.value.pre_deadline_share)} mono />
        </dl>
        <Show
          when={props.value.heatmap != null}
          fallback={
            <NoteLine>
              {str(props.value.heatmap_progress)
                ? detailText("study.heatmapProgress", { progress: str(props.value.heatmap_progress)! })
                : detailText("detail.value.missing")}
            </NoteLine>
          }
        >
          <NoteLine>{detailText("study.heatmapReady")}</NoteLine>
        </Show>
        <NoteLine label={detailText("study.preExam")}>
          {str(props.value.pre_exam_reason) ?? detailText("detail.value.missing")}
        </NoteLine>
      </div>

      <Show when={str(props.value.limitation)}>
        {(value) => <NoteLine label={detailText("evidence.limitation")}>{value()}</NoteLine>}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// submission
// ---------------------------------------------------------------------------

/** One tally: the counts, then the rates the service's gate let through. */
function SubmissionTally(props: { label: string; value: Rec; showRates: boolean }) {
  const v = () => props.value;
  const suppressed = () => v().rates_suppressed === true;
  return (
    <div class="space-y-1.5 rounded-lg border border-border-hairline bg-surface-base p-3">
      <p class="text-xs font-medium text-text-strong">{props.label}</p>
      <div class="grid grid-cols-2 gap-2 @md:grid-cols-4">
        <StatCell label={detailText("submission.n")} value={String(num(v().n) ?? 0)} />
        <StatCell label={detailText("submission.submitted")} value={String(num(v().n_submitted) ?? 0)} />
        <StatCell label={detailText("submission.late")} value={String(num(v().n_late) ?? 0)} />
        <StatCell label={detailText("submission.missing")} value={String(num(v().n_missing) ?? 0)} />
      </div>
      <Show when={props.showRates}>
        <dl class="space-y-1">
          <LabeledRow label={detailText("submission.onTime")} value={String(num(v().n_on_time) ?? 0)} mono />
          <LabeledRow label={detailText("submission.onTimeRate")} value={pct(v().on_time_rate_by_last_touch)} mono />
          <LabeledRow label={detailText("submission.lateRate")} value={pct(v().late_rate)} mono />
          <LabeledRow label={detailText("submission.missingRate")} value={pct(v().missing_rate)} mono />
        </dl>
        <Show when={suppressed()}>
          <NoteLine>{detailText("submission.ratesSuppressed")}</NoteLine>
        </Show>
      </Show>
    </div>
  );
}

function UpcomingList(props: { items: unknown[]; locale: () => Locale }) {
  return (
    <Show when={props.items.length > 0} fallback={<NoteLine>{detailText("submission.upcomingNone")}</NoteLine>}>
      <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
        <For each={props.items}>
          {(raw) => {
            const item = obj(raw);
            const title = () => str(item.title) ?? detailText("submission.homework");
            return (
              <div class="space-y-1 rounded-lg border border-border-hairline bg-surface-base p-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p class="text-xs font-medium text-text-strong">{title()}</p>
                  <div class="flex gap-1.5">
                    <Show when={item.high_priority === true}>
                      <Badge variant="warning" class="rounded-full">{detailText("submission.highPriority")}</Badge>
                    </Show>
                    <Show when={item.submitted === true}>
                      <Badge variant="secondary" class="rounded-full">{detailText("submission.done")}</Badge>
                    </Show>
                  </div>
                </div>
                <dl class="space-y-1">
                  <LabeledRow
                    label={detailText("submission.due")}
                    value={num(item.due_at) === null ? null : formatDateTime(num(item.due_at)!, props.locale())}
                    mono
                  />
                  <LabeledRow label={detailText("submission.hoursLeft")} value={hoursText(item.hours_left)} mono />
                </dl>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

function SubmissionView(props: { value: Rec; locale: () => Locale }) {
  const procrastination = () => obj(props.value.procrastination);
  const upcoming = () => (Array.isArray(props.value.upcoming) ? props.value.upcoming : []);
  return (
    <div class="space-y-3">
      <SubmissionTally label={detailText("submission.overall")} value={obj(props.value.overall)} showRates />
      <div class="grid gap-2 @lg:grid-cols-2">
        <SubmissionTally label={detailText("submission.recent")} value={obj(props.value.recent_30d)} showRates />
        <SubmissionTally label={detailText("submission.previous")} value={obj(props.value.previous_30d)} showRates />
      </div>
      <NoteLine>{detailText("submission.windows")}</NoteLine>

      <div class="space-y-1.5 border-t border-border-hairline pt-3">
        <p class="text-xs font-medium text-text-strong">{detailText("submission.upcoming")}</p>
        <UpcomingList items={upcoming()} locale={props.locale} />
      </div>

      <div class="space-y-1.5 border-t border-border-hairline pt-3">
        <dl class="space-y-1">
          <LabeledRow
            label={detailText("submission.measure")}
            value={props.value.measure === "last_touch" ? detailText("submission.measureLastTouch") : str(props.value.measure)}
          />
          <LabeledRow
            label={detailText("submission.markedMissing")}
            value={String(num(obj(props.value.overall).n_marked_missing) ?? 0)}
            mono
          />
        </dl>
        <NoteLine label={detailText("submission.procrastination")}>
          {str(procrastination().reason) ?? detailText("detail.value.missing")}
        </NoteLine>
      </div>

      <Show when={str(props.value.limitation)}>
        {(value) => <NoteLine label={detailText("evidence.limitation")}>{value()}</NoteLine>}
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// entry points
// ---------------------------------------------------------------------------

/** One module's human view. `module` is the summary member's name; an
 *  unrecognised payload is left to the technical disclosure rather than dumped
 *  as keys. */
export function InsightModuleView(props: { module: string; value: unknown; courseTitle: CourseTitle }) {
  const prefs = usePreferences();
  const value = () => obj(props.value);
  return (
    <Show
      when={props.module === "attendance" || props.module === "marks" || props.module === "study" || props.module === "submission"}
      fallback={<NoteLine>{detailText("detail.elsewhere")}</NoteLine>}
    >
      <Show when={props.module === "attendance"}>
        <AttendanceView value={value()} courseTitle={props.courseTitle} />
      </Show>
      <Show when={props.module === "marks"}>
        <MarksView value={value()} courseTitle={props.courseTitle} />
      </Show>
      <Show when={props.module === "study"}>
        <StudyView value={value()} />
      </Show>
      <Show when={props.module === "submission"}>
        <SubmissionView value={value()} locale={() => prefs.locale()} />
      </Show>
    </Show>
  );
}

// ---------------------------------------------------------------------------
// evidence (attention items, recommendation cards)
// ---------------------------------------------------------------------------

type EvidenceKind = "rate" | "ratePoints" | "points" | "number" | "z" | "ms" | "minutes" | "hours" | "date" | "text" | "band" | "skip";

/** Evidence is ZEKA's loose "neden?" object, one shape per rule. A field with
 *  no entry here has no honest label yet, so it stays in the technical
 *  disclosure; the count is surfaced so nothing looks silently dropped. */
const EVIDENCE_FIELDS: Record<string, { key: InsightDetailKey; kind: EvidenceKind }> = {
  rate: { key: "evidence.rate", kind: "rate" },
  relative_gap: { key: "evidence.relativeGap", kind: "ratePoints" },
  n_obs: { key: "evidence.nObs", kind: "number" },
  n_missing_30d: { key: "evidence.nMissing30", kind: "number" },
  missing_rate_30d: { key: "evidence.missingRate30", kind: "rate" },
  cohort_missing_rate_median: { key: "evidence.cohortMissingMedian", kind: "rate" },
  on_time_rate_30d: { key: "evidence.onTimeRate30", kind: "rate" },
  on_time_rate_prev_30d: { key: "evidence.onTimeRatePrev", kind: "rate" },
  missing_rate_prev_30d: { key: "evidence.missingRatePrev", kind: "rate" },
  n_30d: { key: "evidence.n30", kind: "number" },
  n_prev_30d: { key: "evidence.nPrev30", kind: "number" },
  recent_mean: { key: "evidence.recentMean", kind: "number" },
  previous_mean: { key: "evidence.previousMean", kind: "number" },
  delta: { key: "evidence.delta", kind: "points" },
  n_marks: { key: "evidence.nMarks", kind: "number" },
  measure: { key: "evidence.measure", kind: "skip" },
  student_average: { key: "evidence.studentAverage", kind: "number" },
  class_average: { key: "evidence.classAverage", kind: "number" },
  class_sd: { key: "evidence.classSd", kind: "number" },
  z: { key: "evidence.z", kind: "z" },
  cohort_n: { key: "evidence.cohortN", kind: "number" },
  average: { key: "evidence.average", kind: "number" },
  band: { key: "evidence.band", kind: "band" },
  reading: { key: "evidence.reading", kind: "text" },
  n_stints_28: { key: "evidence.nStints28", kind: "number" },
  active_days_28: { key: "evidence.activeDays28", kind: "number" },
  regularity: { key: "evidence.regularity", kind: "rate" },
  burstiness: { key: "evidence.burstiness", kind: "number" },
  median_stint_min: { key: "evidence.medianStintMin", kind: "minutes" },
  streak_local: { key: "evidence.streakLocal", kind: "number" },
  active_days_delta: { key: "evidence.activeDaysDelta", kind: "number" },
  due_at: { key: "evidence.dueAt", kind: "date" },
  hours_left: { key: "evidence.hoursLeft", kind: "hours" },
  high_priority: { key: "evidence.highPriority", kind: "number" },
  title: { key: "evidence.title", kind: "text" },
  n_answers: { key: "evidence.nAnswers", kind: "number" },
  n_correct: { key: "evidence.nCorrect", kind: "number" },
  accuracy: { key: "evidence.accuracy", kind: "rate" },
  overall_accuracy: { key: "evidence.overallAccuracy", kind: "rate" },
  overall_n_answers: { key: "evidence.overallNAnswers", kind: "number" },
  contrast: { key: "evidence.contrast", kind: "rate" },
  reference_mean_contrast: { key: "evidence.referenceMeanContrast", kind: "rate" },
  reference_n_students: { key: "evidence.referenceNStudents", kind: "number" },
  relative_contrast: { key: "evidence.relativeContrast", kind: "rate" },
  dimension: { key: "evidence.dimension", kind: "text" },
  label: { key: "evidence.label", kind: "text" },
  fact: { key: "evidence.fact", kind: "text" },
  window_from: { key: "evidence.windowFrom", kind: "date" },
  window_to: { key: "evidence.windowTo", kind: "date" },
  burstiness_limitation: { key: "evidence.burstinessLimitation", kind: "text" },
  limitation: { key: "evidence.limitation", kind: "text" },
};

function evidenceValue(kind: EvidenceKind, value: unknown, locale: Locale): { text: string | null; sentence: boolean } {
  switch (kind) {
    case "rate":
      return { text: pct(value), sentence: false };
    case "points":
      return { text: points(value), sentence: false };
    case "ratePoints":
      return { text: ratePoints(value), sentence: false };
    case "z":
      return { text: zText(value), sentence: false };
    case "ms":
      return { text: durationText(value), sentence: false };
    case "minutes":
      return { text: durationText(num(value) === null ? null : num(value)! * 60_000), sentence: false };
    case "hours":
      return { text: hoursText(value), sentence: false };
    case "date":
      return { text: num(value) === null ? null : formatDateTime(num(value)!, locale), sentence: false };
    case "band":
      return { text: bandLabel(value), sentence: false };
    case "text": {
      const text = str(value);
      return { text, sentence: text !== null && /\s/.test(text) };
    }
    case "skip":
      return { text: null, sentence: false };
    default:
      return { text: nText(value), sentence: false };
  }
}

function bandLabel(value: unknown): string | null {
  const band = str(value);
  if (!band) return null;
  const key = BAND_KEYS[band];
  return key ? detailText(key) : null;
}

/** The "neden?" numbers behind one attention item or recommendation card. */
export function InsightEvidenceView(props: { value: unknown }) {
  const prefs = usePreferences();
  const rows = () => {
    const source = obj(props.value);
    const out: { key: InsightDetailKey; text: string; sentence: boolean }[] = [];
    let skipped = 0;
    for (const [field, spec] of Object.entries(EVIDENCE_FIELDS)) {
      if (!(field in source)) continue;
      const raw = source[field];
      // A raw id has no human form here; the technical disclosure keeps it.
      if (isUuid(raw) || (Array.isArray(raw) && raw.some(isUuid))) {
        skipped += 1;
        continue;
      }
      const { text, sentence } = evidenceValue(spec.kind, raw, prefs.locale());
      if (text === null || spec.kind === "skip") {
        skipped += 1;
        continue;
      }
      out.push({ key: spec.key, text, sentence });
    }
    for (const field of Object.keys(source)) {
      if (!(field in EVIDENCE_FIELDS)) skipped += 1;
    }
    return { out, skipped };
  };

  return (
    <Show when={rows().out.length > 0 || rows().skipped > 0}>
      <div class="space-y-1.5">
        <dl class="space-y-1 rounded-lg bg-surface-overlay px-3 py-2">
          <For each={rows().out}>
            {(row) => <LabeledRow label={detailText(row.key)} value={row.text} mono={!row.sentence} />}
          </For>
        </dl>
        <Show when={rows().skipped > 0}>
          <NoteLine>{detailText("evidence.hiddenFields", { count: rows().skipped })}</NoteLine>
        </Show>
      </div>
    </Show>
  );
}

/** The collapsed raw payload behind every labelled view. */
export function InsightTechnicalDetails(props: { value: unknown }) {
  return (
    <details class="rounded-xl border border-border-hairline bg-surface-overlay" data-testid="insight-technical">
      <summary class="cursor-pointer select-none px-4 py-3 text-xs font-medium text-muted-foreground">
        {detailText("detail.technical")}
      </summary>
      <p class="border-t border-border-hairline px-4 pt-2 text-[11px] text-muted-foreground">
        {detailText("detail.technicalHint")}
      </p>
      <pre class="max-h-96 overflow-auto px-4 pb-3 font-mono text-[11px] leading-5 text-muted-foreground">
        {JSON.stringify(props.value, null, 2)}
      </pre>
    </details>
  );
}
