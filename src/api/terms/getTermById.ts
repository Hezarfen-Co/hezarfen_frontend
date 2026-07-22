import { client } from "../client";
import type { Term } from "../client";

export function getTermById(id: string, signal?: AbortSignal): Promise<Term> {
  return client<Term>(`/terms/${id}`, { signal });
}
