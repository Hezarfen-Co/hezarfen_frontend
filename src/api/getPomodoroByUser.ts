import { client } from "./client";
import { pageQuery, type PageParams } from "./page";
import type { PomodoroLog } from "./types";

export function getPomodoroByUser(userId: string, params?: PageParams, signal?: AbortSignal): Promise<PomodoroLog> {
  return client<PomodoroLog>(`/pomodoro/${userId}${pageQuery(params)}`, { signal });
}
