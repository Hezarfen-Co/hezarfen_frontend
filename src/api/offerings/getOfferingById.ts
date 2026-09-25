import { client } from "../client";
import type { Offering } from "../client";

// The raw template row: a null field inherits, it is not the resolved value.
export function getOfferingById(id: string, signal?: AbortSignal): Promise<Offering> {
  return client<Offering>(`/offerings/${id}`, { signal });
}
