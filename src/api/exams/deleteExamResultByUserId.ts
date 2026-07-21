import { client } from "../client";

export function deleteExamResultByUserId(
  examId: string,
  userId: string,
): Promise<void> {
  return client<void>(`/exams/${examId}/results/${userId}`, {
    method: "DELETE",
  });
}
