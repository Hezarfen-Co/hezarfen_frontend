import { client } from "./client";
import type { Term } from "./types";

export function getTerms(signal?: AbortSignal): Promise<Term[]> {
  return client<Term[]>("/terms", { signal });
}
