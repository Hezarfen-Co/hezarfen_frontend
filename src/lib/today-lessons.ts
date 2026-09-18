import type { CourseSession, Instance } from "@/api/client";

export type RollCallState = "not-taken" | "partial" | "done" | "upcoming" | "in-progress";

export type TodayLesson = {
  session: CourseSession;
  instance: Instance;
  /** Roll-call rows saved for the session; null when the read failed. */
  marked: number | null;
  state: RollCallState | null;
};

/** Local-day bounds [start, end) around `now`, in unix milliseconds. */
export function dayBounds(now: number): [number, number] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

/** Sessions that start today, earliest first. */
export function sessionsToday<T extends { starts_at: number }>(sessions: T[], now: number): T[] {
  const [start, end] = dayBounds(now);
  return sessions.filter((session) => session.starts_at >= start && session.starts_at < end).sort((a, b) => a.starts_at - b.starts_at);
}

/**
 * What the teacher still owes a lesson. A lesson that has not started yet is
 * "upcoming" whatever its rows say; after the start, no rows is "not taken",
 * fewer rows than enrolled students is "partial". Rows can include the
 * teacher's own presence, so "done" is at least the roster size.
 */
export function rollCallState(startsAt: number, now: number, marked: number | null, enrolled: number): RollCallState | null {
  if (startsAt > now) return "upcoming";
  if (marked == null) return null;
  if (marked === 0) return "not-taken";
  return marked >= enrolled ? "done" : "partial";
}

/** A student's view of a lesson: only whether it is on right now. */
export function lessonNow(startsAt: number, endsAt: number | null, now: number): "in-progress" | null {
  return startsAt <= now && endsAt != null && now < endsAt ? "in-progress" : null;
}
