import { client } from "./client";
import type { Term } from "./types";

export function getTermById(id: string, signal?: AbortSignal): Promise<Term> {
  return client<Term>(`/terms/${id}`, { signal });
}
