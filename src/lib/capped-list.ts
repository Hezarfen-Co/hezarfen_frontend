import type { Page, PageParams } from "@/api/client";

/** Default first-load size for list pages that filter and page in memory. */
export const LIST_CAP = 100;

export type CappedList<T> = {
  items: T[];
  /** Row count on the server, before the cap. */
  total: number;
};

/**
 * Fetch the first `cap` rows of a list, or every row once the user asks for
 * it. The cap keeps big lists cheap; `total` lets the page say when rows were
 * left out instead of hiding them.
 */
export async function loadCappedList<T>(
  fetch: (params?: PageParams) => Promise<Page<T>>,
  cap: number,
  all: boolean,
): Promise<CappedList<T>> {
  const page = await fetch(all ? undefined : { limit: cap });
  const items = Array.isArray(page.items) ? page.items : [];
  const total = typeof page.total === "number" ? Math.max(page.total, items.length) : items.length;
  return { items, total };
}

export function isTruncated(list: CappedList<unknown> | undefined): boolean {
  return !!list && list.total > list.items.length;
}
