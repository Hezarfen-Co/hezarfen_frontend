export type PageParams = {
  limit?: number;
  offset?: number;
};

export type Page<T> = {
  items: T[];
  total: number;
  limit: number | null;
  offset: number;
};

export function pageQuery(params?: PageParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function appendPageParams(base: URLSearchParams, params?: PageParams): void {
  if (!params) return;
  if (params.limit != null) base.set("limit", String(params.limit));
  if (params.offset != null) base.set("offset", String(params.offset));
}

/** Accept Page envelope or legacy bare array so lists never crash on shape mismatch. */
export function normalizePage<T>(data: unknown): Page<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length, limit: null, offset: 0 };
  }
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.items)) {
      const items = record.items as T[];
      const total = typeof record.total === "number" ? record.total : items.length;
      const limit = typeof record.limit === "number" ? record.limit : null;
      const offset = typeof record.offset === "number" ? record.offset : 0;
      return { items, total, limit, offset };
    }
  }
  return { items: [], total: 0, limit: null, offset: 0 };
}
