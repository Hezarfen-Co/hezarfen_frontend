import { client } from "../client";
import type { Exam } from "../client";

export type PostInstanceExamBody = {
  title: string;
  description?: string | null;
  kind: string;
  /** The dönem the exam is filed in — its marks count into that term's karne. */
  term: string;
  /** Omit for an offline-graded exam nobody can sit. */
  mode?: string | null;
  starts_at?: number | null;
  ends_at?: number | null;
  duration_ms?: number | null;
  /** Default 1; `0` = unlimited retakes. */
  max_attempts?: number | null;
  allow_rejoin?: boolean | null;
  allow_review?: boolean | null;
  /** Keeps the exam private to the instance's managers until published. */
  draft?: boolean | null;
};

/** Only a class-delivered course (`kind` `course`) carries exams. */
export function postInstanceExam(instanceId: string, body: PostInstanceExamBody): Promise<Exam> {
  return client<Exam>(`/instances/${instanceId}/exams`, { method: "POST", body });
}
