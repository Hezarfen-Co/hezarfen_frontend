import { createResource as createSolidResource } from "solid-js";

/**
 * `createResource` whose accessor suspends only until the first value lands.
 *
 * Solid's bare `resource()` re-suspends on every refetch and every source
 * change, so the nearest `<Suspense>` swaps its whole subtree for the fallback:
 * deleting one table row or saving a panel blanked the table card, header,
 * search and pager, and reset the table's own page and query. Reading
 * `resource.latest` instead keeps the last value on screen while the next one
 * loads — only the rows change when it arrives.
 *
 * Detail routes remount per `$id` (the router keys a match by its params), so
 * holding the previous value never shows one record's data under another.
 * `loading`, `error`, `state`, `latest`, `refetch` and `mutate` are unchanged.
 */
export const createResource = ((...args: unknown[]) => {
  const [resource, actions] = (createSolidResource as unknown as (...a: unknown[]) => [Record<string, unknown> & (() => unknown), unknown])(...args);
  const read = () => resource.latest;
  for (const key of ["state", "loading", "error", "latest"] as const) {
    Object.defineProperty(read, key, { get: () => resource[key] });
  }
  return [read, actions];
}) as typeof createSolidResource;
