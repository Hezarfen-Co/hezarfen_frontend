import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Appointment, AppointmentStatus } from "../client";

/**
 * `GET /appointments` filters. All optional and AND-ed; the list stays
 * newest-created first. `starts_after` is unix ms and half-open on the
 * appointment start (`starts_at >= v`).
 */
export type AppointmentListParams = PageParams & {
  /** Only appointments in this state. */
  status?: AppointmentStatus;
  /** Only appointments of the calling staff member; the value is the literal "me". */
  teacher?: "me";
  /** Keeps appointments that have started or start later: `starts_at >= v` (unix ms). */
  starts_after?: number;
  /** Keeps appointments starting before this instant: `starts_at < v` (unix ms). */
  starts_before?: number;
};

export async function getAppointments(params?: AppointmentListParams, signal?: AbortSignal): Promise<Page<Appointment>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null` is load-bearing: the API 400s on a present-but-empty value, so an
  // unset param must drop the key, never emit `key=`.
  if (params?.starts_after != null) query.set("starts_after", String(params.starts_after));
  if (params?.starts_before != null) query.set("starts_before", String(params.starts_before));
  const status = params?.status?.trim();
  if (status) query.set("status", status);
  if (params?.teacher) query.set("teacher", params.teacher);
  const data = await client<unknown>(`/appointments${query.size ? `?${query}` : ""}`, { signal });
  return normalizePage<Appointment>(data);
}
