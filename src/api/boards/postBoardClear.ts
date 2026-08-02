import { client } from "../client";
import type { StrokeRow } from "./types";

// Creator only: bump the epoch, blanking the live canvas (nothing deleted).
// 409 on a closed board. Returns the clear marker.
export function postBoardClear(id: string): Promise<StrokeRow> {
  return client<StrokeRow>(`/boards/${encodeURIComponent(id)}/clear`, { method: "POST" });
}
