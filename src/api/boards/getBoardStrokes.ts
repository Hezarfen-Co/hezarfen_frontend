import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { StrokeRow } from "./types";

// The live canvas: the current epoch's strokes, oldest first. REST catch-up
// / fallback for the same canvas the socket replays.
export async function getBoardStrokes(
  id: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<StrokeRow>> {
  const data = await client<unknown>(
    `/boards/${encodeURIComponent(id)}/strokes${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<StrokeRow>(data);
}
