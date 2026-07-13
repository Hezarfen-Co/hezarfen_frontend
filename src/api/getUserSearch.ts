import { client } from "./client";
import type { PersonRef, Role } from "./types";

export function getUserSearch(query: string, role?: Role, signal?: AbortSignal): Promise<PersonRef[]> {
  const params = new URLSearchParams({ q: query });
  if (role) params.set("role", role);
  return client<PersonRef[]>(`/users/search?${params.toString()}`, { signal });
}
