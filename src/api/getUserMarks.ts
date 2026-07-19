import { client } from "./client";
import type { MarksReport } from "./types";

function userKey(userId: string): string {
  return userId.includes(":") ? userId.split(":").pop()! : userId;
}

export function getUserMarks(userId: string, signal?: AbortSignal): Promise<MarksReport> {
  return client<MarksReport>(`/marks/${encodeURIComponent(userKey(userId))}`, { signal });
}
