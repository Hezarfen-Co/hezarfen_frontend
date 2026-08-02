import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { MealAttendance } from "../client";

export async function getMealAttendanceByUserId(
  userId: string,
  params?: PageParams & { from?: string; to?: string },
  signal?: AbortSignal,
): Promise<Page<MealAttendance>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const data = await client<unknown>(
    `/meals/attendance/${encodeURIComponent(userId)}${query.size ? `?${query}` : ""}`,
    { signal },
  );
  return normalizePage<MealAttendance>(data);
}
