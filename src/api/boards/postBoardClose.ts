import { client } from "../client";
import type { Board } from "./types";

// Creator only: retire the board — permanently read-only, still fully
// readable; idempotent, no reopen.
export function postBoardClose(id: string): Promise<Board> {
  return client<Board>(`/boards/${encodeURIComponent(id)}/close`, { method: "POST" });
}
