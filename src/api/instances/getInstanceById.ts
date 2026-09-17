import { client } from "../client";
import type { Instance } from "../client";

export function getInstanceById(id: string, signal?: AbortSignal): Promise<Instance> {
  return client<Instance>(`/instances/${id}`, { signal });
}
