import { client } from "../client";
import type { MealBooking } from "../client";

export function deleteMealBookingById(id: string): Promise<MealBooking> {
  return client<MealBooking>(`/meals/bookings/${encodeURIComponent(id)}`, { method: "DELETE" });
}
