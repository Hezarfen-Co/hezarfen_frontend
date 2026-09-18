import { createResource } from "@/lib/create-resource";

/**
 * Resources for a board of independent panels (the dashboard).
 *
 * A plain resource rethrows its error on read, so one failed request took
 * down every panel with it. Here a failed source reads as `undefined` — its
 * panel shows its own empty/"—" state while `.error` stays available for the
 * board's notice — and `retryFailed` refetches only the sources that failed.
 */
export function createBoardResources() {
  const sources: { failed: () => boolean; refetch: () => unknown }[] = [];

  const resource = ((...args: unknown[]) => {
    const [res, actions] = (createResource as unknown as (...a: unknown[]) => [Record<string, unknown> & (() => unknown), { refetch: () => unknown }])(...args);
    const read = () => (res.error ? undefined : res());
    for (const key of ["state", "loading", "error"] as const) {
      Object.defineProperty(read, key, { get: () => res[key] });
    }
    Object.defineProperty(read, "latest", { get: () => (res.error ? undefined : res.latest) });
    sources.push({ failed: () => !!res.error, refetch: actions.refetch });
    return [read, actions];
  }) as typeof createResource;

  const retryFailed = () => {
    for (const source of sources) if (source.failed()) void source.refetch();
  };

  return { createResource: resource, retryFailed };
}
