import { client } from "../client";
import type { Builder } from "../client";

export function getBuilderMe(signal?: AbortSignal): Promise<Builder> {
  return client<Builder>("/builder/me", { signal });
}
