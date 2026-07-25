/**
 * Minimal live-backend client for the contract suite: a cookie jar (fetch keeps
 * none of its own in bun/node) plus a hard timeout so a dead port fails fast
 * instead of hanging the run. Boot recipe: see vitest.contract.config.ts.
 */
// The app's tsconfig has no node types (browser build), so reach env this way.
const env: Record<string, string | undefined> =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

export const contractBaseUrl = (env.CONTRACT_BASE_URL ?? "").replace(/\/+$/, "");
export const isLive = contractBaseUrl !== "";

export const SKIP_MESSAGE =
  "[contract] CONTRACT_BASE_URL unset — skipping live contract tests. " +
  "Boot a scratch backend (see vitest.contract.config.ts) and re-run with " +
  "CONTRACT_BASE_URL=http://127.0.0.1:8081 bun run test:contract";

const TIMEOUT_MS = 10_000;
let cookie = "";

type Init = { method?: string; body?: unknown; headers?: Record<string, string> };

/** Raw request — returns the Response so tests can assert on status codes. */
export async function api(path: string, init: Init = {}): Promise<Response> {
  const headers: Record<string, string> = { ...init.headers };
  if (cookie) headers.Cookie = cookie;

  let body: BodyInit | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  const res = await fetch(`${contractBaseUrl}${path}`, {
    method: init.method ?? "GET",
    headers,
    body,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const pair = raw.split(";")[0];
    if (pair.startsWith("session=")) cookie = pair;
  }
  return res;
}

/** Request + JSON body, throwing on a non-2xx so setup failures are loud. */
export async function json<T>(path: string, init: Init = {}): Promise<T> {
  const res = await api(path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${text}`);
  }
  return (text ? JSON.parse(text) : null) as T;
}

/** Log in as the seeded admin; the session cookie lands in the jar. */
export async function loginAdmin(): Promise<void> {
  await json("/auth/login", {
    method: "POST",
    body: {
      username: env.ADMIN_USERNAME ?? "admin",
      password: env.ADMIN_PASSWORD ?? "admin123",
    },
  });
}

/** Smallest valid 1x1 PNG, for the image-upload steps. */
export function pngFile(name: string): File {
  const bytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    ),
    (c) => c.charCodeAt(0),
  );
  return new File([bytes], name, { type: "image/png" });
}
