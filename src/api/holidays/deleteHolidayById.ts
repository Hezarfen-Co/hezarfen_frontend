import { client } from "../client";

// Manager+. Lessons already generated on those days stay where they are.
export function deleteHolidayById(id: string): Promise<void> {
  return client<void>(`/holidays/${id}`, { method: "DELETE" });
}
