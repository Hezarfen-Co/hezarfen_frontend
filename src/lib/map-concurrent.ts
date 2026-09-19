/**
 * `Promise.all(items.map(fn))` with at most `limit` calls in flight. For the
 * per-row fan-outs the backend has no bulk read for (marks, balances, member
 * counts): an unbounded burst of a few hundred GETs trips the backend's rate
 * limit and stalls every other request the page makes behind it.
 *
 * Results keep the input order. A rejection rejects the whole call, like
 * `Promise.all` — callers that tolerate a failed row catch inside `fn`.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return results;
}

/** In-flight cap shared by the page-level fan-outs. */
export const FAN_OUT_LIMIT = 6;
