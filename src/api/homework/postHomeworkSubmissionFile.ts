import { formClient } from "../client";
import type { HomeworkFile } from "../client";

export function postHomeworkSubmissionFile(id: string, file: File, signal?: AbortSignal): Promise<HomeworkFile> {
  const body = new FormData();
  body.append("file", file);
  return formClient<HomeworkFile>(`/homework/${id}/submission/files`, body, signal);
}
