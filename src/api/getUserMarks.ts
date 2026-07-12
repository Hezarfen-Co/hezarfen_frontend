import { client } from "./client";
import type { MarksReport } from "./types";

export function getUserMarks(userId: string, signal?: AbortSignal): Promise<MarksReport> {
  return client<MarksReport>(`/marks/${userId}`, { signal });
}
