import { client } from "../client";

export function deleteSlotById(id: string): Promise<void> {
  return client<void>(`/appointments/slots/${id}`, { method: "DELETE" });
}
