import { client } from "../client";
import type { MealBooking } from "../client";

export function postMealBooking(menuId: string, studentId?: string): Promise<MealBooking> {
  return client<MealBooking>(`/meals/menus/${encodeURIComponent(menuId)}/bookings`, {
    method: "POST",
    body: studentId ? { student_id: studentId } : {},
  });
}
