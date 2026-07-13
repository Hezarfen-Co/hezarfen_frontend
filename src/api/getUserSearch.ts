import { client } from "./client";
import type { PersonRef } from "./types";

export function getUserSearch(query: string, signal?: AbortSignal): Promise<PersonRef[]> {
  const params = new URLSearchParams({ q: query });
  return client<PersonRef[]>(`/users/search?${params.toString()}`, { signal });
}
