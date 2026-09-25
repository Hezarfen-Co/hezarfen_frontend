import type { MealAttendance, MealBooking, PersonRef } from "@/api/client";

/** One student on a menu's service list: their booking (managers only) and their service mark. */
export type MealServiceEntry = { student: PersonRef; booking: MealBooking | null; attendance: MealAttendance | null };
