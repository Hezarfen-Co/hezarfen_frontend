import { client } from "@/api/client";

let pendingTimePromise: Promise<{ now: number }> | null = null;

export async function getTime(signal?: AbortSignal): Promise<{ now: number }> {
  if (pendingTimePromise) return pendingTimePromise;
  pendingTimePromise = client<{ now: number }>("/time", { signal, cache: "no-store" }).finally(() => {
    pendingTimePromise = null;
  });
  return pendingTimePromise;
}
