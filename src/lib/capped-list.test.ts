import type { Page, PageParams } from "@/api/client";
import { isTruncated, loadCappedList } from "./capped-list";

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
