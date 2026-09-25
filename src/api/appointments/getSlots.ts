import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { AppointmentSlot } from "../client";

/**
 * `GET /appointments/slots` filters. All optional and AND-ed; the list stays
 * `starts_at ASC`. `starts_after` is unix ms and half-open on the slot start
 * (`starts_at >= v`).
 */
export type SlotListParams = PageParams & {
  /** Only slots of the calling staff member; the value is the literal "me". */
  teacher?: "me";
  /** Keeps slots that have started or start later: `starts_at >= v` (unix ms). */
  starts_after?: number;
};

export async function getSlots(params?: SlotListParams, signal?: AbortSignal): Promise<Page<AppointmentSlot>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so an
  // unset param must drop the key, never emit `key=`.
  if (params?.starts_after != null) query.set("starts_after", String(params.starts_after));
  if (params?.teacher) query.set("teacher", params.teacher);
  const data = await client<unknown>(`/appointments/slots${query.size ? `?${query}` : ""}`, { signal });
  return normalizePage<AppointmentSlot>(data);
}
