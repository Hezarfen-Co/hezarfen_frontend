import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { Term } from "../client";

export async function getTerms(params?: PageParams, signal?: AbortSignal): Promise<Page<Term>> {
  const data = await client<unknown>(`/terms${pageQuery(params)}`, { signal });
  return normalizePage<Term>(data);
}
