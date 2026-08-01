import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { StrokeRow } from "./types";

// The epoch index: every clear marker (each carries the closed epoch + its
// final stroke count), oldest first. The open epoch is deliberately absent.
export async function getBoardEpochs(
  id: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<StrokeRow>> {
  const data = await client<unknown>(
    `/boards/${encodeURIComponent(id)}/epochs${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<StrokeRow>(data);
}
