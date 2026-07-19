import { client } from "./client";
import type { AttemptQuestion, AttemptQuestionResponse } from "./types";

export async function getExamAttemptQuestions(examId: string, signal?: AbortSignal): Promise<AttemptQuestion[]> {
  const questions = await client<AttemptQuestionResponse[]>(`/exams/${examId}/attempt/questions`, { signal });
  return questions.map((question) => ({ ...question, exam: examId }));
}
