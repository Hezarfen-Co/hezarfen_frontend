import { client } from "../client";
import type { StudentInsight } from "../client";

/**
 * The caller's own insight. A student gets their summary, their own cards and
 * their segment profile — and `attention` always empty: the attention list is
 * written about them, never for them. Any other role gets the cards addressed
 * to them (a teacher's `T4` cards about their students) with `summary` and
 * `segments` empty, so neither section can be rendered as "no data".
 */
export function getMyInsight(signal?: AbortSignal): Promise<StudentInsight> {
  return client<StudentInsight>("/insights/me", { signal });
}
