import { client } from "../client";
import type { Board, BoardInviteBody } from "./types";

// Adds every member of a class, course/club or event to the roster in one
// pass. Creator only. Additive and idempotent — it never removes anyone, and
// members already on the board are skipped. Parents and ids that no longer
// resolve are dropped silently, but going over max_participants refuses the
// whole invite with a 409 and adds nobody. A named id that does not exist is a
// 400, not a 404 — a 404 here would mean the board itself.
export function postBoardInvite(id: string, body: BoardInviteBody): Promise<Board> {
  return client<Board>(`/boards/${encodeURIComponent(id)}/invite`, { method: "POST", body });
}
