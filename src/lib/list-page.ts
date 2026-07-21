import type { Page, PageParams } from "@/api/client";

export type ListPageState<T> = {
  items: T[];
  total: number;
};

/** Server page when `clientMode` is false; full fetch + caller-supplied filter when true. */
export async function loadListPage<T>(options: {
  page: number;
  pageSize: number;
  clientMode: boolean;
  fetch: (params?: PageParams) => Promise<Page<T>>;
  filter?: (items: T[]) => T[];
}): Promise<ListPageState<T>> {
  if (options.clientMode) {
    const all = await options.fetch();
    const source = Array.isArray(all.items) ? all.items : [];
    const filtered = options.filter ? options.filter(source) : source;
    const start = options.page * options.pageSize;
    return {
      items: filtered.slice(start, start + options.pageSize),
      total: filtered.length,
    };
  }

  const result = await options.fetch({
    limit: options.pageSize,
    offset: options.page * options.pageSize,
  });
  const items = Array.isArray(result.items) ? result.items : [];
  const total = typeof result.total === "number" ? result.total : items.length;
  return { items, total };
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}
