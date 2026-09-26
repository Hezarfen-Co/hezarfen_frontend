import { createEffect, createSignal, on, onCleanup } from "solid-js";
import type { Page, PageParams } from "@/api/client";

/** Rows fetched per request while the reader scrolls a server-paged list. */
export const INFINITE_PAGE_SIZE = 50;
/** The most rows one request may ask for when refetching or restoring. */
const MAX_BATCH = 500;

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
  /** Start the current query over from its first page. */
  reload: () => void;
  /**
   * Refetch every row loaded so far in one request and swap them in place,
   * keeping the reader's place (a poll, or after an edit or delete). Skipped
   * while a page is in flight.
   */
  refresh: () => Promise<void>;
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
  options: {
    pageSize?: number;
    equals?: (a: K, b: K) => boolean;
    /**
     * Remember how many rows were loaded (per query, for this tab) so coming
     * back from a detail page loads them again in one request and the
     * browser's scroll restoration has the rows to land on.
     */
    restoreKey?: string;
  } = {},
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

  const storageKey = () => (options.restoreKey && key !== null ? `infinite:${options.restoreKey}:${JSON.stringify(key)}` : null);
  const savedCount = () => {
    const name = storageKey();
    if (!name) return 0;
    try {
      const count = Number(sessionStorage.getItem(name));
      return Number.isFinite(count) ? Math.min(Math.max(0, Math.floor(count)), MAX_BATCH) : 0;
    } catch {
      return 0;
    }
  };
  const saveCount = (count: number) => {
    const name = storageKey();
    if (!name) return;
    try {
      sessionStorage.setItem(name, String(count));
    } catch {
      // storage full or blocked: the list still works, it just starts short
    }
  };

  const fetchNext = async () => {
    if (key === null || loading()) return;
    const run = generation;
    const current = key;
    const offset = items().length;
    // The first page of a query restored from session storage asks for as
    // many rows as were loaded before, in one request.
    const limit = offset === 0 ? Math.max(pageSize, savedCount()) : pageSize;
    setLoading(true);
    setError(undefined);
    try {
      const page = await fetchPage(current, { limit, offset });
      if (run !== generation) return;
      const rows = Array.isArray(page.items) ? page.items : [];
      setItems((prev) => (offset === 0 ? rows : [...prev, ...rows]));
      const next = offset + rows.length;
      // A short page ends the list even if `total` says otherwise, so a stale
      // count never keeps asking for pages that are not there.
      setTotal(rows.length < limit ? next : Math.max(typeof page.total === "number" ? page.total : next, next));
      setLoaded(true);
      saveCount(next);
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
    refresh: async () => {
      if (key === null || loading() || !loaded()) return;
      const run = generation;
      const current = key;
      const limit = Math.min(Math.max(pageSize, items().length), MAX_BATCH);
      try {
        const page = await fetchPage(current, { limit, offset: 0 });
        if (run !== generation) return;
        const rows = Array.isArray(page.items) ? page.items : [];
        setItems(rows);
        setTotal(rows.length < limit ? rows.length : Math.max(typeof page.total === "number" ? page.total : rows.length, rows.length));
        setError(undefined);
      } catch (err) {
        if (run === generation) setError(err);
      }
    },
    mutate: (update) => setItems((prev) => update(prev)),
  };
}
