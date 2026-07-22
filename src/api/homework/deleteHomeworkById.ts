import { client } from "../client";

export function deleteHomeworkById(id: string): Promise<void> {
  return client<void>(`/homework/${id}`, { method: "DELETE" });
}
