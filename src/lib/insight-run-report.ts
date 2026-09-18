import type { InsightRun, PersonRef, StudentInsight } from "@/api/client";
import { runReportText } from "@/i18n/insights-run-report";
import { messages, type Locale, type MessageKey } from "@/i18n/messages";
import { formatDateTime } from "@/lib/format";

/**
 * The school run report's model and its Markdown rendering.
 *
 * The report has no aggregate door: the backend serves a run's counters
 * (`GET /insights/runs`) and one student at a time (`GET /insights/students/{id}`),
 * and nothing in between. So the school picture is composed here, from the
 * students whose signals have been read, and every number the model carries is
 * stated together with how many students it was computed over — a partial read
 * must never read as "the school has none".
 *
 * The Markdown is the report: the panel renders this model, and the clipboard,
 * the `.md` download and the print document are all built from the same model,
 * so what is exported is exactly what is shown.
 */

export type ModuleId = "marks" | "attendance" | "study" | "submission";

export type ModuleCoverage = {
  id: ModuleId;
  /** Students whose module holds a measurement (not merely a computed shell). */
  with_data: number;
  /** Students whose summary carries the module at all. */
  computed: number;
  /** The module's own limitation sentence, when it ships one. */
  limitation: string | null;
};

export type StudentSignal = {
  id: string;
  name: string;
  /**
   * `ok` — a summary was read. `no_summary` — the door answered and nothing has
   * been computed for this student. `not_loaded` — this report has not read
   * them yet. `error` — the read itself failed.
   */
  state: "ok" | "no_summary" | "not_loaded" | "error";
  error: string | null;
  confidence: string | null;
  computed_at: number | null;
  attention: number;
  cards: number;
  segments: number;
  marks: { courses_with_marks: number; courses_total: number; average: number | null };
  attendance: { rate: number | null; observed: number };
  study: { stints: number };
  submission: { counted: number };
};

export type RunReportModel = {
  run: InsightRun;
  students: StudentSignal[];
  /** How many students the school picture was computed over. */
  coverage: { loaded: number; total: number };
  modules: ModuleCoverage[];
  totals: { attention: number; cards: number; segments: number };
  pending: { id: string; name: string | null }[];
  roster_error: string | null;
};

// ---- reading ZEKA's module payloads ---------------------------------------
//
// The module members are `unknown` by contract and the service may grow them,
// so every read is by name behind a shape check: a missing field means "this
// module measured nothing", never a throw and never a zero invented from a
// different field.

/** The shape gate every module read goes through; `null` for anything else. */
function recordOf(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** A finite number, or `null` — counts and rates alike are read through this. */
function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function readMarks(marks: unknown): StudentSignal["marks"] {
  const courses = recordOf(recordOf(marks)?.courses) ?? {};
  const rows = Object.values(courses);
  let withMarks = 0;
  let sum = 0;
  let counted = 0;
  for (const row of rows) {
    const course = recordOf(row);
    if (!course) continue;
    if ((finiteNumber(course.n_marks) ?? 0) > 0) withMarks += 1;
    const average = finiteNumber(course.average);
    if (average != null) {
      sum += average;
      counted += 1;
    }
  }
  return {
    courses_with_marks: withMarks,
    courses_total: rows.length,
    average: counted > 0 ? sum / counted : null,
  };
}

export function readAttendance(attendance: unknown): StudentSignal["attendance"] & { limitation: string | null } {
  const module = recordOf(attendance);
  const overall = recordOf(module?.overall);
  const limitation = module?.limitation;
  return {
    rate: finiteNumber(overall?.rate),
    observed: finiteNumber(overall?.n_obs) ?? 0,
    limitation: typeof limitation === "string" && limitation.trim().length > 0 ? limitation : null,
  };
}

export function readStudy(study: unknown): StudentSignal["study"] & { limitation: string | null } {
  const module = recordOf(study);
  const recent = recordOf(module?.recent_28d);
  const limitation = module?.limitation;
  return {
    stints: finiteNumber(recent?.n_stints) ?? 0,
    limitation: typeof limitation === "string" && limitation.trim().length > 0 ? limitation : null,
  };
}

export function readSubmission(submission: unknown): StudentSignal["submission"] & { limitation: string | null } {
  const module = recordOf(submission);
  const overall = recordOf(module?.overall);
  const limitation = module?.limitation;
  return {
    counted: finiteNumber(overall?.n) ?? 0,
    limitation: typeof limitation === "string" && limitation.trim().length > 0 ? limitation : null,
  };
}

const EMPTY_SIGNAL: Omit<StudentSignal, "id" | "name" | "state" | "error"> = {
  confidence: null,
  computed_at: null,
  attention: 0,
  cards: 0,
  segments: 0,
  marks: { courses_with_marks: 0, courses_total: 0, average: null },
  attendance: { rate: null, observed: 0 },
  study: { stints: 0 },
  submission: { counted: 0 },
};

/** One student's readable signal line, from whatever the door answered. */
export function toStudentSignal(
  person: { id: string; name: string },
  insight: StudentInsight | null | undefined,
  error: string | null,
): StudentSignal {
  const identity = { id: person.id, name: person.name };
  if (error) return { ...identity, ...EMPTY_SIGNAL, state: "error", error };
  if (!insight) return { ...identity, ...EMPTY_SIGNAL, state: "not_loaded", error: null };
  const summary = insight.summary ?? null;
  if (!summary) {
    return {
      ...identity,
      ...EMPTY_SIGNAL,
      state: "no_summary",
      error: null,
      attention: insight.attention.length,
      cards: insight.cards.length,
      segments: insight.segments.length,
    };
  }
  return {
    ...identity,
    state: "ok",
    error: null,
    confidence: summary.confidence,
    computed_at: summary.computed_at,
    attention: insight.attention.length,
    cards: insight.cards.length,
    segments: insight.segments.length,
    marks: readMarks(summary.marks),
    attendance: readAttendance(summary.attendance),
    study: readStudy(summary.study),
    submission: readSubmission(summary.submission),
  };
}

/** Whether a module holds a measurement for one student. */
export function moduleHasData(signal: StudentSignal, id: ModuleId): boolean {
  if (signal.state !== "ok") return false;
  if (id === "marks") return signal.marks.courses_with_marks > 0;
  if (id === "attendance") return signal.attendance.observed > 0;
  if (id === "study") return signal.study.stints > 0;
  return signal.submission.counted > 0;
}

export function buildRunReportModel(args: {
  run: InsightRun;
  roster: PersonRef[];
  insights: Record<string, StudentInsight>;
  errors: Record<string, string>;
  coverageTotal: number;
  rosterError: string | null;
}): RunReportModel {
  const students = args.roster.map((person) =>
    toStudentSignal(
      { id: person.id, name: person.display_name || person.username || person.id },
      args.insights[person.id] ?? null,
      args.errors[person.id] ?? null,
    ),
  );
  const nameById: Record<string, string> = {};
  for (const person of args.roster) {
    nameById[person.id] = person.display_name || person.username;
  }
  const loaded = students.filter((student) => student.state === "ok" || student.state === "no_summary");
  const limitations: Record<ModuleId, string | null> = {
    marks: null,
    attendance: null,
    study: null,
    submission: null,
  };
  for (const student of loaded) {
    const summary = args.insights[student.id]?.summary;
    if (!summary) continue;
    const found: [ModuleId, string | null][] = [
      ["attendance", readAttendance(summary.attendance).limitation],
      ["study", readStudy(summary.study).limitation],
      ["submission", readSubmission(summary.submission).limitation],
    ];
    for (const [id, value] of found) {
      if (value && !limitations[id]) limitations[id] = value;
    }
  }
  const modules: ModuleCoverage[] = (["marks", "attendance", "study", "submission"] as ModuleId[]).map((id) => ({
    id,
    with_data: loaded.filter((student) => moduleHasData(student, id)).length,
    computed: loaded.filter((student) => args.insights[student.id]?.summary?.[id] != null).length,
    limitation: limitations[id],
  }));
  return {
    run: args.run,
    students,
    coverage: { loaded: loaded.length, total: args.coverageTotal },
    modules,
    totals: {
      attention: loaded.reduce((sum, student) => sum + student.attention, 0),
      cards: loaded.reduce((sum, student) => sum + student.cards, 0),
      segments: loaded.reduce((sum, student) => sum + student.segments, 0),
    },
    pending: args.run.pending_students.map((id) => ({ id, name: nameById[id] ?? null })),
    roster_error: args.rosterError,
  };
}

// ---- rendering -------------------------------------------------------------

/** Run durations are sub-second in practice, so minutes-only would read "0 dk". */
export function formatRunDuration(ms: number | null | undefined, locale: Locale): string {
  if (ms == null) return "—";
  const tr = locale === "tr";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return tr ? `${(ms / 1000).toFixed(1)} sn` : `${(ms / 1000).toFixed(1)} s`;
  const minutes = ms / 60_000;
  if (minutes < 60) return tr ? `${minutes.toFixed(1)} dk` : `${minutes.toFixed(1)} min`;
  return tr ? `${(minutes / 60).toFixed(1)} sa` : `${(minutes / 60).toFixed(1)} h`;
}

export function moduleLabel(locale: Locale, id: ModuleId): string {
  if (id === "marks") return runReportText(locale, "moduleMarks");
  if (id === "attendance") return runReportText(locale, "moduleAttendance");
  if (id === "study") return runReportText(locale, "moduleStudy");
  return runReportText(locale, "moduleSubmission");
}

const STATUS_LABELS: Record<string, Record<string, string>> = {
  tr: { running: "Sürüyor", ok: "Tamamlandı", partial: "Kısmi", failed: "Başarısız", skipped: "Atlandı" },
  en: { running: "Running", ok: "Completed", partial: "Partial", failed: "Failed", skipped: "Skipped" },
};

export function runReportStatusLabel(locale: Locale, status: string): string {
  return STATUS_LABELS[locale][status] ?? status;
}

const CONFIDENCE_KEYS: Record<string, MessageKey> = {
  none: "insights.confidence.none",
  exploratory: "insights.confidence.exploratory",
  stable: "insights.confidence.stable",
};

/**
 * ZEKA's confidence tiers, in the reader's language. They come from the app's
 * own dictionary so the drawer and the report cannot disagree; a tier the
 * dictionary does not know stays raw rather than being guessed at.
 */
export function confidenceText(locale: Locale, confidence: string): string {
  const key = CONFIDENCE_KEYS[confidence];
  if (!key) return confidence;
  return messages[locale][key] ?? messages.en[key] ?? confidence;
}

/**
 * A failed pipeline stage. The values are zeka's own stage names
 * (`discover_students` / `fetch` / `compute` / `store`); an unrecognised one is
 * shown as the technical stage it is, and the raw list stays in the report's
 * technical disclosure.
 */
const FAILED_STAGE_LABELS: Record<string, Record<string, string>> = {
  tr: { discover_students: "Öğrenci listesi", fetch: "Veri toplama", compute: "Hesaplama", store: "Kayıt" },
  en: { discover_students: "Student list", fetch: "Data fetch", compute: "Computation", store: "Storage" },
};

export function failedStageText(locale: Locale, stage: string): string {
  return FAILED_STAGE_LABELS[locale][stage] ?? stage;
}

export function runReportFileName(runDay: string): string {
  return `okul-analiz-raporu-${runDay}.md`;
}

/** `0,716` in Turkish, `0.716` in English — the same number either way. */
export function runReportDecimal(value: number, locale: Locale): string {
  return value.toFixed(1).replace(".", locale === "tr" ? "," : ".");
}

/** `85%`, or `veri yok` when the module measured nothing. */
export function runReportPercent(value: number | null, locale: Locale): string {
  return value == null ? runReportText(locale, "noData") : `${Math.round(value * 100)}%`;
}

export function studentStatusText(locale: Locale, student: StudentSignal): string {
  if (student.state === "ok") return runReportStatusLabel(locale, "ok");
  if (student.state === "no_summary") return runReportText(locale, "noSummary");
  if (student.state === "error") return student.error ?? runReportText(locale, "noData");
  return runReportText(locale, "notLoaded");
}

/**
 * `Yüklenmedi` while nothing has been read, `veri yok` only once a read has
 * said so — the two are different claims, and the panel and the export must
 * make the same one.
 */
export function studentMarksText(locale: Locale, student: StudentSignal): string {
  if (student.state === "not_loaded") return runReportText(locale, "notLoaded");
  if (student.state !== "ok") return runReportText(locale, "noData");
  const average = student.marks.average == null ? "—" : runReportDecimal(student.marks.average, locale);
  return `${average} (${student.marks.courses_with_marks}/${student.marks.courses_total})`;
}

export function studentAttendanceText(locale: Locale, student: StudentSignal): string {
  if (student.state === "not_loaded") return runReportText(locale, "notLoaded");
  if (student.state !== "ok" || student.attendance.observed === 0) return runReportText(locale, "noData");
  return runReportPercent(student.attendance.rate, locale);
}

/**
 * The report as Markdown — what `Kopyala`, the `.md` download and the print
 * document all carry. Every section of the panel is here, `veri yok` lines
 * included: an export that silently dropped the empty modules would be a
 * prettier lie than the screen.
 */
export function buildRunReportMarkdown(model: RunReportModel, locale: Locale): string {
  const t = (key: Parameters<typeof runReportText>[1], vars?: Record<string, string | number>) =>
    runReportText(locale, key, vars);
  const { run, coverage } = model;
  const lines: string[] = [];
  lines.push(`# ${t("documentTitle", { day: run.run_day })}`);
  lines.push("");
  lines.push(`## ${t("runSection")}`);
  lines.push(`- ${t("runDay")}: ${run.run_day}`);
  lines.push(`- ${t("status")}: ${runReportStatusLabel(locale, run.status)}`);
  lines.push(`- ${t("startedAt")}: ${formatDateTime(run.started_at, locale)}`);
  lines.push(`- ${t("finishedAt")}: ${formatDateTime(run.finished_at, locale)}`);
  lines.push(
    `- ${t("processed")}: ${run.students_ok}/${run.students_total} (${t("skipped").toLowerCase()} ${run.students_skipped}, ${t("failed").toLowerCase()} ${run.students_failed})`,
  );
  lines.push(`- ${t("rowsWritten")}: ${run.rows_written}`);
  lines.push(`- ${t("duration")}: ${formatRunDuration(run.duration_ms, locale)}`);
  lines.push(
    `- ${t("budget")}: ${run.budget_exceeded ? t("budgetExceeded") : t("budgetWithin")} (${formatRunDuration(run.budget_ms, locale)})`,
  );
  const issueCount = run.pending_students.length + run.failed_modules.length + (run.budget_exceeded ? 1 : 0);
  lines.push(`- ${t("issues")}: ${issueCount === 0 ? t("noIssues") : String(issueCount)}`);
  if (run.pending_students.length > 0) {
    // Same list, same order as the panel: the export names them, not just counts them.
    const named = model.pending.length > 0
      ? `: ${model.pending.map((row) => row.name ?? "—").join(", ")}`
      : "";
    lines.push(`- ${t("pendingStudents", { count: run.pending_students.length })}${named}`);
  }
  if (run.failed_modules.length > 0) {
    lines.push(
      `- ${t("failedModules", { modules: run.failed_modules.map((stage) => failedStageText(locale, stage)).join(", ") })}`,
    );
  }
  lines.push("");
  lines.push(`## ${t("schoolSection")}`);
  if (model.roster_error) lines.push(`- ${t("rosterFailed", { message: model.roster_error })}`);
  lines.push(`- ${t("coverage", { loaded: coverage.loaded, total: coverage.total })}`);
  if (coverage.loaded === 0) lines.push(`- ${t("rosterEmpty")}`);
  for (const module of model.modules) {
    const label = moduleLabel(locale, module.id);
    const covered = t("moduleCovered", { label, withData: module.with_data, total: coverage.loaded });
    lines.push(`- ${covered}${module.with_data === 0 ? ` → ${t("noData")}` : ""}`);
    if (module.limitation) lines.push(`  - ${module.limitation}`);
  }
  if (coverage.loaded > 0 && model.modules.every((module) => module.with_data === 0)) {
    lines.push(`- ${t("modulesEmpty")}`);
  }
  lines.push(
    `- ${t("attention")}: ${model.totals.attention} · ${t("cards")}: ${model.totals.cards} · ${t("segments")}: ${model.totals.segments}`,
  );
  lines.push(`- ${t("coverageNote")}`);
  lines.push("");
  lines.push(`## ${t("studentsSection")} (${coverage.loaded}/${coverage.total})`);
  const header = [
    t("student"),
    t("status"),
    t("confidence"),
    t("attention"),
    t("cards"),
    t("marksAverage"),
    t("attendanceRate"),
    t("computedAt"),
  ];
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);
  for (const student of model.students) {
    const cells = [
      student.name,
      studentStatusText(locale, student),
      student.confidence == null ? t("noData") : confidenceText(locale, student.confidence),
      String(student.attention),
      String(student.cards),
      studentMarksText(locale, student),
      studentAttendanceText(locale, student),
      formatDateTime(student.computed_at, locale),
    ];
    lines.push(`| ${cells.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`);
  }
  if (model.students.length === 0) lines.push(`| ${t("rosterEmpty")} | | | | | | | |`);
  lines.push("");
  lines.push(`## ${t("technical")}`);
  lines.push(t("technicalHint"));
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(run, null, 2));
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
