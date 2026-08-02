import { client } from "../client";
import type { Limits } from "../client";

let cachedLimits: Limits | null = null;
let pendingLimits: Promise<Limits> | null = null;

export function getLimits(signal?: AbortSignal): Promise<Limits> {
  if (cachedLimits) return Promise.resolve(cachedLimits);
  if (pendingLimits) return pendingLimits;
  pendingLimits = client<Limits>("/limits", { signal })
    .then((limits) => (cachedLimits = limits))
    .finally(() => {
      pendingLimits = null;
    });
  return pendingLimits;
}

export function setCachedLimits(limits: Limits | null): void {
  cachedLimits = limits;
  pendingLimits = null;
}
