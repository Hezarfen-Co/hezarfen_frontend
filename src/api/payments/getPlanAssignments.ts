import { client, normalizePage, pageQuery, type Page, type PageParams } from "../client";
import type { FeePlanAssignment } from "./types";

export async function getPlanAssignments(
  planId: string,
  params?: PageParams,
  signal?: AbortSignal,
): Promise<Page<FeePlanAssignment>> {
  const data = await client<unknown>(
    `/payments/plans/${encodeURIComponent(planId)}/assignments${pageQuery(params)}`,
    { signal },
  );
  return normalizePage<FeePlanAssignment>(data);
}
