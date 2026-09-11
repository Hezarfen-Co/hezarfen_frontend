import { client } from "../client";
import type { ModuleCatalog } from "../client";

export function getModulesCatalog(signal?: AbortSignal): Promise<ModuleCatalog> {
  return client<ModuleCatalog>("/modules/catalog", { signal });
}
