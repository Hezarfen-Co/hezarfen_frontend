import { client } from "../client";
import { pageQuery, type PageParams } from "../client";
import type { PomodoroLog } from "../client";

export function getPomodoroByUser(userId: string, params?: PageParams, signal?: AbortSignal): Promise<PomodoroLog> {
  return client<PomodoroLog>(`/pomodoro/${userId}${pageQuery(params)}`, { signal });
}
