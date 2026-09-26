import { createEffect, createSignal, on, onCleanup } from "solid-js";
import type { Page, PageParams } from "@/api/client";

/** Rows fetched per request while the reader scrolls a server-paged list. */
export const INFINITE_PAGE_SIZE = 50;

export type InfiniteList<T> = {
  /** Every row fetched so far, in server order. */
  items: () => T[];
  /** Row count on the server for the current query. */
  total: () => number;
  /** True until the first page of the current query lands. */
  initialLoading: () => boolean;
  /** A page request is in flight (the first or a later one). */
  loading: () => boolean;
  error: () => unknown;
  hasMore: () => boolean;
  /** Fetch the next page; a no-op while one is in flight or none is left. */
  loadMore: () => void;
  /** Start the current query over from its first page (after a create/delete). */
  reload: () => void;
  /** Patch the loaded rows in place (an edit that needs no refetch). */
  mutate: (update: (items: T[]) => T[]) => void;
};

/**
 * A list that fetches page by page as the reader scrolls, instead of reading
 * every row up front. `source` is the query: search text and server filters.
 * A new value (compared with `equals`) drops the rows and starts from offset
 * 0; `null`/`undefined`/`false` means "not ready" and fetches nothing.
 *
 * Only fit for a list whose every search and filter the backend applies —
 * the backend takes no sort parameter, so the order is the server's, and a
 * filter applied in the browser would only see the rows loaded so far.
 */
export function createInfiniteList<T, K>(
  source: () => K | null | undefined | false,
  fetchPage: (key: K, params: PageParams) => Promise<Page<T>>,
  options: { pageSize?: number; equals?: (a: K, b: K) => boolean } = {},
): InfiniteList<T> {
  const pageSize = options.pageSize ?? INFINITE_PAGE_SIZE;
  const [items, setItems] = createSignal<T[]>([]);
  const [total, setTotal] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [loaded, setLoaded] = createSignal(false);
  const [error, setError] = createSignal<unknown>(undefined);
  // Bumped on every new query so a slow response for an old one is dropped.
  let generation = 0;
  let key: K | null = null;

  const fetchNext = async () => {
    if (key === null || loading()) return;
    const run = generation;
    const current = key;
    const offset = items().length;
    setLoading(true);
    setError(undefined);
    try {
      const page = await fetchPage(current, { limit: pageSize, offset });
      if (run !== generation) return;
      const rows = Array.isArray(page.items) ? page.items : [];
      setItems((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      const next = offset + rows.length;
      // A short page ends the list even if `total` says otherwise, so a stale
      // count never keeps asking for pages that are not there.
      setTotal(rows.length < pageSize ? next : Math.max(typeof page.total === "number" ? page.total : next, next));
      setLoaded(true);
    } catch (err) {
      if (run === generation) setError(err);
    } finally {
      if (run === generation) setLoading(false);
    }
  };

  const start = () => {
    generation += 1;
    setItems([]);
    setTotal(0);
    setLoaded(false);
    setLoading(false);
    setError(undefined);
    if (key !== null) void fetchNext();
  };

  createEffect(
    on(source, (next) => {
      const ready = next !== null && next !== undefined && next !== false;
      if (ready && key !== null && (options.equals ? options.equals(key, next as K) : key === next)) return;
      key = ready ? (next as K) : null;
      start();
    }),
  );
  onCleanup(() => {
    generation += 1;
  });

  const hasMore = () => loaded() && error() === undefined && items().length < total();

  return {
    items,
    total,
    initialLoading: () => key !== null && !loaded() && error() === undefined,
    loading,
    error,
    hasMore,
    loadMore: () => {
      if (hasMore()) void fetchNext();
    },
    reload: start,
    mutate: (update) => setItems((prev) => update(prev)),
  };
}
