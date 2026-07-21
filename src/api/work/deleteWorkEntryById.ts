import { client } from "../client";

export function deleteWorkEntryById(id: string): Promise<void> {
  return client<void>(`/work/entries/${id}`, { method: "DELETE" });
}
