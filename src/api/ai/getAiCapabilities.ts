import { client } from "../client";
import type { AiCapabilities } from "../client";

/**
 * What the AI bridge can currently do. `enabled: false` is a discovery answer,
 * not an error — the deployment simply runs no AI.
 */
export function getAiCapabilities(signal?: AbortSignal): Promise<AiCapabilities> {
  return client<AiCapabilities>("/ai/capabilities", { signal });
}
