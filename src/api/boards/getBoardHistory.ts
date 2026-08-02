import {
  appendPageParams,
  client,
  normalizePage,
  type Page,
} from "../client";
import type { BoardHistoryParams, StrokeRow } from "./types";

// The whole append-only log, oldest first, clear markers included. `epoch`
// narrows to a single epoch (for session replay); omit for the whole life.
export async function getBoardHistory(
  id: string,
  params?: BoardHistoryParams,
  signal?: AbortSignal,
): Promise<Page<StrokeRow>> {
  const query = new URLSearchParams();
  if (params?.epoch != null) query.set("epoch", String(params.epoch));
  appendPageParams(query, params);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const data = await client<unknown>(`/boards/${encodeURIComponent(id)}/history${suffix}`, {
    signal,
  });
  return normalizePage<StrokeRow>(data);
}
