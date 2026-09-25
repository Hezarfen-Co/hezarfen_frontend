import { client } from "../client";
import { appendPageParams, type PageParams } from "../client";
import type { PomodoroLog } from "../client";

/** `/pomodoro/me` window on `started_at`, UTC unix ms. Both optional, AND-ed. */
export type PomodoroMeParams = PageParams & {
  /** Keeps sessions started at or after T: `started_at >= T`. */
  from?: number;
  /** Keeps sessions started before T: `started_at < T`. */
  to?: number;
};

export function getPomodoroMe(params?: PomodoroMeParams, signal?: AbortSignal): Promise<PomodoroLog> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so
  // an unset bound must drop the key, never emit `from=`.
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));
  const value = query.toString();
  return client<PomodoroLog>(`/pomodoro/me${value ? `?${value}` : ""}`, { signal });
}
