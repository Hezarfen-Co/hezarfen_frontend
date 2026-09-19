import type { Homework, HomeworkRosterEntry } from "@/api/client";

const DAY_MS = 24 * 60 * 60 * 1000;
/** How far back a due date still counts as work waiting on the teacher. */
export const QUEUE_LOOKBACK_MS = 14 * DAY_MS;
/** How far ahead: homework due in the next two days is worth a glance now. */
export const QUEUE_LOOKAHEAD_MS = 2 * DAY_MS;
/** Roster reads per board load; there is no bulk endpoint. */
export const QUEUE_CAP = 6;

export type QueueRow = {
  homework: Homework;
  /** Students in the audience who have not handed in (`missing`). */
  missing: number;
  /** Handed in, not graded yet. */
  toGrade: number;
};

/** The teacher's own homework due around now, most recently due first. */
export function queueCandidates(items: Homework[], teacherId: string, now: number): Homework[] {
  return items
    .filter((item) => item.created_by === teacherId && item.due_at >= now - QUEUE_LOOKBACK_MS && item.due_at <= now + QUEUE_LOOKAHEAD_MS)
    .sort((a, b) => Math.abs(now - a.due_at) - Math.abs(now - b.due_at))
    .slice(0, QUEUE_CAP);
}

/** Counts from one homework's roster; rows left behind by an unenrollment are not owed. */
export function queueRow(homework: Homework, roster: HomeworkRosterEntry[]): QueueRow {
  const current = roster.filter((row) => !row.unenrolled);
  return {
    homework,
    missing: current.filter((row) => row.missing).length,
    toGrade: current.filter((row) => row.submission != null && row.result == null).length,
  };
}
