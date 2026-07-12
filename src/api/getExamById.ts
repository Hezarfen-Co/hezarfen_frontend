import { client } from "./client";
import type { Exam } from "./types";

export function getExamById(id: string, signal?: AbortSignal): Promise<Exam> {
  return client<Exam>(`/exams/${id}`, { signal });
}
