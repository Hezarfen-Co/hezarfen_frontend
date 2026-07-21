import { client } from "../client";
import { pageQuery, type PageParams } from "../client";
import type { PomodoroLog } from "../client";

export function getPomodoroMe(params?: PageParams, signal?: AbortSignal): Promise<PomodoroLog> {
  return client<PomodoroLog>(`/pomodoro/me${pageQuery(params)}`, { signal });
}
