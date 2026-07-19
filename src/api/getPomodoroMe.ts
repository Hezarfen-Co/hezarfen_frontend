import { client } from "./client";
import { pageQuery, type PageParams } from "./page";
import type { PomodoroLog } from "./types";

export function getPomodoroMe(params?: PageParams, signal?: AbortSignal): Promise<PomodoroLog> {
  return client<PomodoroLog>(`/pomodoro/me${pageQuery(params)}`, { signal });
}
