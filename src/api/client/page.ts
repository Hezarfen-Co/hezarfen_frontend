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

/**
 * A list route returned a successful response, but not the list shape the UI
 * can safely render. Keeping this distinct from an empty list prevents a
 * backend DTO regression from looking like "there is no data".
 */
export class PageShapeError extends Error {
  constructor() {
    super("Unexpected paginated response from the server");
    this.name = "PageShapeError";
  }
}

/**
 * Schedule-window filters, UTC unix ms. Only `/events` and `/exams` honour
 * them; both are optional and AND-ed when both sent, and a row with no
 * schedule at all is excluded by either. Sending either flips the server
 * order to ASCENDING by schedule (soonest first) instead of newest-created.
 */
export type ScheduleWindowParams = {
  /** Keeps rows that have not begun: `starts_at > T`. */
  starts_after?: number;
  /** Keeps rows whose window has not finished: `ends_at > T`, else `starts_at > T`. */
  ends_after?: number;
};

export function pageQuery(params?: PageParams & ScheduleWindowParams): string {
  if (!params) return "";
  const query = new URLSearchParams();
  // `!= null` is load-bearing: the API 400s on a present-but-empty value
  // (`?limit=`), so an undefined param must drop the key, never emit `key=`.
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));
  if (params.starts_after != null) query.set("starts_after", String(params.starts_after));
  if (params.ends_after != null) query.set("ends_after", String(params.ends_after));
  const value = query.toString();
  return value ? `?${value}` : "";
}

export function appendPageParams(base: URLSearchParams, params?: PageParams): void {
  if (!params) return;
  if (params.limit != null) base.set("limit", String(params.limit));
  if (params.offset != null) base.set("offset", String(params.offset));
}

/** Accept the documented page envelope or a legacy bare array during backend rollouts. */
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
  throw new PageShapeError();
}
