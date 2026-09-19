import { formatApiError, type PersonRef, type Role, type StudentInsight } from "@/api/client";
import { getInsightByUserId } from "@/api/insights";
import { getMyStudents } from "@/api/parents";
import { getUserSearch } from "@/api/users";
import { personLabel } from "@/lib/person";
import { toStudentSignal, type StudentSignal } from "@/lib/insight-run-report";

/** Students the viewer may analyse: a parent's linked children, or the school's students for staff. */
export async function loadInsightStudents(role: Role): Promise<PersonRef[]> {
  return role === "parent"
    ? (await getMyStudents({ limit: 200 })).items
    : (await getUserSearch("", undefined, "student", { limit: 200 })).items;
}

/** Parallel insight reads; there is no bulk endpoint. */
const READ_CONCURRENCY = 6;

/**
 * Read every student's insight a few at a time, reporting each row as it
 * lands so the table fills progressively instead of waiting on the slowest.
 * A failed read becomes that row's `error` state, never a made-up value.
 */
export async function loadStudentSignals(
  students: PersonRef[],
  onRow: (signal: StudentSignal) => void,
  read: (userId: string) => Promise<StudentInsight> = getInsightByUserId,
): Promise<void> {
  const queue = [...students];
  const worker = async () => {
    for (let person = queue.shift(); person; person = queue.shift()) {
      const identity = { id: person.id, name: personLabel(person) };
      try {
        onRow(toStudentSignal(identity, await read(person.id), null));
      } catch (error) {
        onRow(toStudentSignal(identity, null, formatApiError(error)));
      }
    }
  };
  await Promise.all(Array.from({ length: READ_CONCURRENCY }, worker));
}

export type InsightOverview = {
  total: number;
  /** Rows read so far (any state but `not_loaded`). */
  loaded: number;
  /** Students with a computed summary. */
  analysed: number;
  /** Students with at least one attention item. */
  needAttention: number;
  /** Mean of the per-student mark averages that exist; null when none do. */
  marksAverage: number | null;
  /** Mean of the observed attendance rates (0..1); null when none observed. */
  attendanceRate: number | null;
};

/** The school picture over the rows read so far — only fields a summary actually measured. */
export function insightOverview(signals: StudentSignal[], total: number): InsightOverview {
  const analysed = signals.filter((signal) => signal.state === "ok");
  const marks = analysed.map((signal) => signal.marks.average).filter((value): value is number => value != null);
  const attendance = analysed
    .filter((signal) => signal.attendance.observed > 0 && signal.attendance.rate != null)
    .map((signal) => signal.attendance.rate as number);
  const mean = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
  return {
    total,
    loaded: signals.filter((signal) => signal.state !== "not_loaded").length,
    analysed: analysed.length,
    needAttention: signals.filter((signal) => signal.attention > 0).length,
    marksAverage: mean(marks),
    attendanceRate: mean(attendance),
  };
}
