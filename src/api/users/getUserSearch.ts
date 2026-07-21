import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { PersonRef, Role } from "../client";

export async function getUserSearch(
  query: string,
  signal?: AbortSignal,
  role?: Role,
  page?: PageParams,
): Promise<Page<PersonRef>> {
  const params = new URLSearchParams({ q: query });
  if (role) params.set("role", role);
  appendPageParams(params, page);
  const data = await client<unknown>(`/users/search?${params.toString()}`, { signal });
  return normalizePage<PersonRef>(data);
}
