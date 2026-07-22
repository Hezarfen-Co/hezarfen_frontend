import { client } from "../client";
import type { HomeworkSubmission } from "../client";

export type PostHomeworkSubmissionBody = {
  text?: string | null;
};

export function postHomeworkSubmission(id: string, body: PostHomeworkSubmissionBody): Promise<HomeworkSubmission> {
  return client<HomeworkSubmission>(`/homework/${id}/submission`, { method: "POST", body });
}
