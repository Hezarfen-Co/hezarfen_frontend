import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Appointment } from "../client";

export async function getAppointments(params?: PageParams, signal?: AbortSignal): Promise<Page<Appointment>> {
  const data = await client<unknown>(`/appointments${pageQuery(params)}`, { signal });
  return normalizePage<Appointment>(data);
}
