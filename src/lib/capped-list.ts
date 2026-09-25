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

/** Requests in flight at once while a list's later pages are read. */
const PAGE_CONCURRENCY = 3;

/**
 * Every row of a list the backend can only page (`limit` / `offset`, no
 * search or filter): the first page names the total, the rest are read in
 * parallel, in order. The page then searches, filters and pages in memory
 * over the whole list, so there is no "first 100 of 161" cut to explain.
 */
export async function loadAllPages<T>(
  fetch: (params?: PageParams) => Promise<Page<T>>,
  pageSize: number = LIST_CAP,
): Promise<T[]> {
  const first = await fetch({ limit: pageSize, offset: 0 });
  const items = Array.isArray(first.items) ? [...first.items] : [];
  const total = typeof first.total === "number" ? first.total : items.length;
  if (items.length < pageSize || items.length >= total) return items;
  const offsets: number[] = [];
  for (let offset = items.length; offset < total; offset += pageSize) offsets.push(offset);
  const pages: T[][] = new Array(offsets.length);
  for (let start = 0; start < offsets.length; start += PAGE_CONCURRENCY) {
    const batch = offsets.slice(start, start + PAGE_CONCURRENCY);
    const results = await Promise.all(batch.map((offset) => fetch({ limit: pageSize, offset })));
    results.forEach((page, index) => { pages[start + index] = Array.isArray(page.items) ? page.items : []; });
  }
  return items.concat(...pages);
}
