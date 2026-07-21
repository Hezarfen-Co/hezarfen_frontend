import { vi } from "vitest";

/**
 * Shared fetch-mocking helpers for API tests.
 *
 * Every helper calls `vi.stubGlobal("fetch", ...)` so a single
 * `afterEach(() => vi.restoreAllMocks())` in each test file is enough.
 */

type FetchFn = typeof globalThis.fetch;

/** Return the `[url, init]` pair from the most recent `fetch` call. */
export function lastFetchCall(): [string, RequestInit | undefined] {
  const fn = globalThis.fetch as ReturnType<typeof vi.fn>;
  const calls = fn.mock.calls as [string, RequestInit | undefined][];
  return calls[calls.length - 1];
}

/** Stub fetch to return a successful JSON response. */
export function mockFetchSuccess(data: unknown, status = 200): void {
  const fn: FetchFn = async () =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  vi.stubGlobal("fetch", vi.fn(fn));
}

/** Stub fetch to return a 204 No Content response. */
export function mockFetch204(): void {
  const fn: FetchFn = async () => new Response(null, { status: 204 });
  vi.stubGlobal("fetch", vi.fn(fn));
}

/** Stub fetch to return an error JSON response. */
export function mockFetchError(status: number, body?: Record<string, unknown>, headers?: Record<string, string>): void {
  const fn: FetchFn = async () =>
    new Response(body ? JSON.stringify(body) : null, {
      status,
      statusText: "Error",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  vi.stubGlobal("fetch", vi.fn(fn));
}

/** Stub fetch to return a Blob response. */
export function mockFetchBlob(blob: Blob): void {
  const fn: FetchFn = async () =>
    new Response(blob, {
      status: 200,
      headers: { "Content-Type": blob.type || "application/octet-stream" },
    });
  vi.stubGlobal("fetch", vi.fn(fn));
}
