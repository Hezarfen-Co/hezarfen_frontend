import { getExamQuestions } from "@/api/exams";

/**
 * True when a save takes a draft exam live: it was a draft before and the
 * new values clear the flag. Creating straight into live (no `before`) also
 * counts — a brand-new exam never has questions yet.
 */
export function isPublishing(before: { draft?: boolean } | null | undefined, nextDraft: boolean): boolean {
  if (nextDraft) return false;
  return before == null || before.draft === true;
}

/**
 * How many questions an exam holds. The exam row carries no count, so this
 * asks the questions list for a one-row page and reads its `total`.
 */
export async function countExamQuestions(examId: string): Promise<number> {
  return (await getExamQuestions(examId, { limit: 1 })).total;
}
