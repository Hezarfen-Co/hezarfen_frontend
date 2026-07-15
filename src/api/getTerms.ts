import { client } from "./client";
import { normalizePage, pageQuery, type Page, type PageParams } from "./page";
import type { Term } from "./types";

export async function getTerms(params?: PageParams, signal?: AbortSignal): Promise<Page<Term>> {
  const data = await client<unknown>(`/terms${pageQuery(params)}`, { signal });
  return normalizePage<Term>(data);
}
