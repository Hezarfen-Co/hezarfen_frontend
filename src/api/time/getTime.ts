import { client } from "@/api/client";

export async function getTime(signal?: AbortSignal): Promise<{ now: number }> {
  return client<{ now: number }>("/time", { signal, cache: "no-store" });
}
