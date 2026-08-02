import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { MealBooking } from "../client";

export async function getMyMealBookings(params?: PageParams, signal?: AbortSignal): Promise<Page<MealBooking>> {
  const data = await client<unknown>(`/meals/bookings/me${pageQuery(params)}`, { signal });
  return normalizePage<MealBooking>(data);
}
