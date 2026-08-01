import { client } from "../client";
import type { Board, UpdateBoardBody } from "./types";

// Re-title (any participant); roster + lock are the creator's alone (403).
export function patchBoardById(id: string, body: UpdateBoardBody): Promise<Board> {
  return client<Board>(`/boards/${encodeURIComponent(id)}`, { method: "PATCH", body });
}
