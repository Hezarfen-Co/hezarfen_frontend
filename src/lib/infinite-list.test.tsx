import { createRoot, createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import type { Page, PageParams } from "@/api/client";
import { createInfiniteList } from "./infinite-list";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function server(total: number) {
  const rows = Array.from({ length: total }, (_, i) => i);
  return vi.fn(async (query: string, params: PageParams): Promise<Page<string>> => {
    const offset = params.offset ?? 0;
    const limit = params.limit ?? total;
    return { items: rows.slice(offset, offset + limit).map((n) => `${query}${n}`), total, limit, offset };
  });
}

describe("createInfiniteList", () => {
  it("fetches only the first page, then one page per loadMore", async () => {
    const fetch = server(120);
    await createRoot(async (dispose) => {
      const list = createInfiniteList(() => "r", fetch, { pageSize: 50 });
      await flush();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenLastCalledWith("r", { limit: 50, offset: 0 });
      expect(list.items()).toHaveLength(50);
      expect(list.total()).toBe(120);
      expect(list.hasMore()).toBe(true);

      list.loadMore();
      list.loadMore(); // ignored while the first is in flight
      await flush();
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenLastCalledWith("r", { limit: 50, offset: 50 });

      list.loadMore();
      await flush();
      expect(list.items()).toHaveLength(120);
      expect(list.hasMore()).toBe(false);
      list.loadMore();
      await flush();
      expect(fetch).toHaveBeenCalledTimes(3);
      dispose();
    });
  });

  it("starts over from offset 0 when the query changes and drops a stale reply", async () => {
    let release: (() => void) | undefined;
    const fetch = vi.fn(async (query: string, params: PageParams): Promise<Page<string>> => {
      if (query === "slow") await new Promise<void>((resolve) => (release = resolve));
      return { items: [`${query}-${params.offset}`], total: 1, limit: params.limit ?? 50, offset: params.offset ?? 0 };
    });
    await createRoot(async (dispose) => {
      const [query, setQuery] = createSignal("slow");
      const list = createInfiniteList(query, fetch);
      await flush();
      setQuery("fast");
      await flush();
      release?.();
      await flush();
      expect(list.items()).toEqual(["fast-0"]);
      dispose();
    });
  });

  it("fetches nothing until the source is ready", async () => {
    const fetch = server(5);
    await createRoot(async (dispose) => {
      const [ready, setReady] = createSignal<string | null>(null);
      const list = createInfiniteList(ready, fetch);
      await flush();
      expect(fetch).not.toHaveBeenCalled();
      expect(list.initialLoading()).toBe(false);
      setReady("x");
      await flush();
      expect(list.items()).toHaveLength(5);
      dispose();
    });
  });

  it("ends the list on a short page even if the total disagrees", async () => {
    const fetch = vi.fn(async (_: string, params: PageParams): Promise<Page<number>> => ({
      items: [1, 2],
      total: 999,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    }));
    await createRoot(async (dispose) => {
      const list = createInfiniteList(() => "q", fetch, { pageSize: 50 });
      await flush();
      expect(list.total()).toBe(2);
      expect(list.hasMore()).toBe(false);
      dispose();
    });
  });

  it("refresh refetches the loaded rows in one request and keeps them", async () => {
    const fetch = server(120);
    await createRoot(async (dispose) => {
      const list = createInfiniteList(() => "r", fetch, { pageSize: 50 });
      await flush();
      list.loadMore();
      await flush();
      expect(list.items()).toHaveLength(100);
      await list.refresh();
      expect(fetch).toHaveBeenLastCalledWith("r", { limit: 100, offset: 0 });
      expect(list.items()).toHaveLength(100);
      expect(list.hasMore()).toBe(true);
      dispose();
    });
  });

  it("restores the loaded row count for a query from session storage", async () => {
    sessionStorage.clear();
    const fetch = server(120);
    await createRoot(async (dispose) => {
      const list = createInfiniteList(() => "r", fetch, { pageSize: 50, restoreKey: "t" });
      await flush();
      list.loadMore();
      await flush();
      dispose();
    });
    fetch.mockClear();
    await createRoot(async (dispose) => {
      const list = createInfiniteList(() => "r", fetch, { pageSize: 50, restoreKey: "t" });
      await flush();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenLastCalledWith("r", { limit: 100, offset: 0 });
      expect(list.items()).toHaveLength(100);
      dispose();
    });
  });
});
