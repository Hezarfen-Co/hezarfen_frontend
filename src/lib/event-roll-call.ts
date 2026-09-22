import type { AttendanceStatus } from "@/api/client";
import type { MessageKey } from "@/i18n/messages";

/**
 * Event wording for the core attendance statuses. The backend knows the same
 * status values for lessons and events; only the label changes ("Var" reads
 * as "in class" — at an event the student "attended"). Unknown school-defined
 * statuses have no entry and fall back to the shared lesson label or the raw
 * value.
 */
const EVENT_STATUS_KEYS: Record<string, MessageKey> = {
  present: "events.status.present",
  absent: "events.status.absent",
  late: "events.status.late",
  excused: "events.status.excused",
};

export function eventStatusLabelKey(status: AttendanceStatus): MessageKey | null {
  return EVENT_STATUS_KEYS[status] ?? null;
}

/**
 * The school's statuses in its own order, except "present" leads — it is the
 * status taken most, so it sits first on every row (as in lesson roll call).
 */
export function orderRollCallStatuses(list: readonly AttendanceStatus[]): AttendanceStatus[] {
  return list.includes("present") ? ["present", ...list.filter((status) => status !== "present")] : [...list];
}

export type RollCallChange = { userId: string; status: AttendanceStatus };

/**
 * The rows a save has to send: every drafted status that differs from what
 * the server already holds. A draft equal to the saved mark is a no-op.
 */
export function rollCallChanges(
  saved: Readonly<Record<string, AttendanceStatus | null | undefined>>,
  draft: Readonly<Record<string, AttendanceStatus | undefined>>,
): RollCallChange[] {
  const changes: RollCallChange[] = [];
  for (const [userId, status] of Object.entries(draft)) {
    if (status && saved[userId] !== status) changes.push({ userId, status });
  }
  return changes;
}

/**
 * Roll call opens once the event has started. An event with no start time
 * has nothing to wait for and is always open.
 */
export function isRollCallOpen(startsAt: number | null | undefined, now: number): boolean {
  return startsAt == null || startsAt <= now;
}

export type RollCallSaveResult = {
  saved: RollCallChange[];
  failed: { change: RollCallChange; error: unknown }[];
};

/**
 * Sends the changes one at a time — the API marks a single user per call and
 * has no bulk endpoint. A failed row does not stop the rest; each outcome is
 * reported so the caller can show per-row errors.
 */
export async function saveRollCallChanges(
  changes: readonly RollCallChange[],
  send: (change: RollCallChange) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void,
): Promise<RollCallSaveResult> {
  const result: RollCallSaveResult = { saved: [], failed: [] };
  let done = 0;
  for (const change of changes) {
    try {
      await send(change);
      result.saved.push(change);
    } catch (error) {
      result.failed.push({ change, error });
    }
    done += 1;
    onProgress?.(done, changes.length);
  }
  return result;
}
