import { client } from "./client";

export function deleteExamById(id: string): Promise<void> {
  return client<void>(`/exams/${id}`, { method: "DELETE" });
}
