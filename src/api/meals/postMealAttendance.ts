import { client } from "../client";
import type { MealAttendance } from "../client";

export function postMealAttendance(menuId: string, studentId: string, status: string): Promise<MealAttendance> {
  return client<MealAttendance>(`/meals/menus/${encodeURIComponent(menuId)}/attendance`, {
    method: "POST",
    body: { student_id: studentId, status },
  });
}
