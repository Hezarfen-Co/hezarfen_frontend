import { client } from "../client";
import { normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { User } from "../client";

export async function getUsers(params?: PageParams, signal?: AbortSignal): Promise<Page<User>> {
  const data = await client<unknown>(`/users${pageQuery(params)}`, { signal });
  return normalizePage<User>(data);
}
