import { client } from "../client";

// Creator only: delete the board and its whole stroke log; frees a board seat.
export function deleteBoardById(id: string): Promise<void> {
  return client<void>(`/boards/${encodeURIComponent(id)}`, { method: "DELETE" });
}
