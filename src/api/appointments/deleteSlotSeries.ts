import { client } from "../client";

export function deleteSlotSeries(series: string): Promise<void> {
  return client<void>(`/appointments/slots/series/${series}`, { method: "DELETE" });
}
