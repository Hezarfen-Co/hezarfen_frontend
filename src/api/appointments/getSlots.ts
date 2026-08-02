import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { AppointmentSlot } from "../client";

export async function getSlots(params?: PageParams, signal?: AbortSignal): Promise<Page<AppointmentSlot>> {
  const data = await client<unknown>(`/appointments/slots${pageQuery(params)}`, { signal });
  return normalizePage<AppointmentSlot>(data);
}
