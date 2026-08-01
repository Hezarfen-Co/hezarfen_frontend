import { client } from "../client";
import type { Board, CreateBoardBody } from "./types";

// Open a whiteboard; the caller becomes its creator. 409 at max_boards_per_creator.
export function postBoard(body: CreateBoardBody): Promise<Board> {
  return client<Board>("/boards", { method: "POST", body });
}
