import { client } from "../client";
import type { EnabledModules } from "../client";

export function getModules(signal?: AbortSignal): Promise<EnabledModules> {
  return client<EnabledModules>("/modules", { signal });
}
