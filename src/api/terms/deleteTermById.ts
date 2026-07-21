import { client } from "../client";

export function deleteTermById(id: string): Promise<void> {
  return client<void>(`/terms/${id}`, { method: "DELETE" });
}
