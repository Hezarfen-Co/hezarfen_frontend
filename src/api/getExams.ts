import { client } from "./client";
import type { Exam } from "./types";

export function getExams(signal?: AbortSignal): Promise<Exam[]> {
  return client<Exam[]>("/exams", { signal });
}
