import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { RagOutput } from "../client";

export async function getCourseNoteRag(
  noteId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<RagOutput>> {
  const data = await client<unknown>(`/course-notes/${noteId}/rag${pageQuery(params)}`, { signal });
  return normalizePage<RagOutput>(data);
}
