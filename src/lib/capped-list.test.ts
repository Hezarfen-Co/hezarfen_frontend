import type { Page, PageParams } from "@/api/client";
import { isTruncated, loadAllPages, loadCappedList } from "./capped-list";

const page = (items: number[], total: number): Page<number> => ({ items, total, limit: null, offset: 0 });

it("asks for the cap and reports the server total", async () => {
  const fetch = vi.fn(async (_params?: PageParams) => page([1, 2], 5));
  const list = await loadCappedList(fetch, 2, false);
  expect(fetch).toHaveBeenCalledWith({ limit: 2 });
  expect(list).toEqual({ items: [1, 2], total: 5 });
  expect(isTruncated(list)).toBe(true);
});

it("fetches every row without a limit when asked for all", async () => {
  const fetch = vi.fn(async (_params?: PageParams) => page([1, 2, 3, 4, 5], 5));
  const list = await loadCappedList(fetch, 2, true);
  expect(fetch).toHaveBeenCalledWith(undefined);
  expect(isTruncated(list)).toBe(false);
});

it("never reports a total below the rows it holds", async () => {
  const list = await loadCappedList(async () => page([1, 2, 3], 1), 10, false);
  expect(list.total).toBe(3);
  expect(isTruncated(undefined)).toBe(false);
});

it("reads every page of a paged list, in order", async () => {
  const all = Array.from({ length: 7 }, (_, index) => index);
  const fetch = vi.fn(async (params?: PageParams) => {
    const offset = params?.offset ?? 0;
    return page(all.slice(offset, offset + (params?.limit ?? all.length)), all.length);
  });
  expect(await loadAllPages(fetch, 3)).toEqual(all);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(fetch).toHaveBeenCalledWith({ limit: 3, offset: 6 });
});

it("stops after one request when the first page holds everything", async () => {
  const fetch = vi.fn(async () => page([1, 2], 2));
  expect(await loadAllPages(fetch, 100)).toEqual([1, 2]);
  expect(fetch).toHaveBeenCalledTimes(1);
});
