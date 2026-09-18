import type { HomeworkReportEntry } from "@/api/client";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type ChildHomeworkSummary = {
  /** Past due and not handed in, most overdue first. */
  missing: HomeworkReportEntry[];
  /** Not handed in and due within the next seven days, soonest first. */
  dueSoon: HomeworkReportEntry[];
};

/** A parent's view of a child's homework report: what is late and what is next. */
export function summarizeChildHomework(entries: HomeworkReportEntry[], now: number): ChildHomeworkSummary {
  return {
    missing: entries.filter((entry) => entry.missing).sort((a, b) => a.due_at - b.due_at),
    dueSoon: entries
      .filter((entry) => !entry.submitted && !entry.missing && entry.due_at >= now && entry.due_at < now + WEEK_MS)
      .sort((a, b) => a.due_at - b.due_at),
  };
}
