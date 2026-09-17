import { client } from "../client";
import type { StudentInsight } from "../client";

/**
 * One student's insight as an observer reads it. Teacher+ narrowed to the
 * students they reach, or a parent holding a live link to that student;
 * everyone else gets the same 404 a missing id gets, so a refusal must not be
 * shown as "forbidden".
 */
export function getInsightByUserId(userId: string, signal?: AbortSignal): Promise<StudentInsight> {
  return client<StudentInsight>(`/insights/students/${encodeURIComponent(userId)}`, { signal });
}
