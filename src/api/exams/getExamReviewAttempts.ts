import { client } from "@/api/client";

/** Sitting seqs the caller has for this exam, ascending (e.g. [1, 2]). Self-review; needs allow_review + marked. */
export async function getExamReviewAttempts(examId: string, signal?: AbortSignal): Promise<number[]> {
  return client<number[]>(`/exams/${encodeURIComponent(examId)}/review/attempts`, { signal });
}
