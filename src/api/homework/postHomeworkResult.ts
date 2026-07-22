import { client } from "../client";
import type { HomeworkResult } from "../client";

export type PostHomeworkResultBody = {
  user: string;
  status: string;
  mark?: number | null;
};

export function postHomeworkResult(id: string, body: PostHomeworkResultBody): Promise<HomeworkResult> {
  return client<HomeworkResult>(`/homework/${id}/results`, { method: "POST", body });
}
