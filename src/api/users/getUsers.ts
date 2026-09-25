import { client } from "../client";
import { appendPageParams, normalizePage, type Page, type PageParams } from "../client";
import type { Role, User } from "../client";

export type UserListParams = PageParams & {
  /** Keep only these roles; comma-joined on the wire, omitted when empty. */
  roles?: Role[];
};

export async function getUsers(params?: UserListParams, signal?: AbortSignal): Promise<Page<User>> {
  const query = new URLSearchParams();
  appendPageParams(query, params);
  // `!= null`/blank guards are load-bearing: the API 400s on a
  // present-but-empty value (`?roles=`), so an empty list drops the key.
  const roles = (params?.roles ?? []).map((role) => role.trim()).filter((role) => role !== "");
  if (roles.length) query.set("roles", roles.join(","));
  const suffix = query.size ? `?${query}` : "";
  const data = await client<unknown>(`/users${suffix}`, { signal });
  return normalizePage<User>(data);
}
