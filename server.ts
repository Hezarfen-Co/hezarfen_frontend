// Production server: serve the built SPA and reverse-proxy /api/* to the
// backend, so the browser stays same-origin (session cookies, no CORS). This
// replaces the old nginx image — Bun serves the static `dist/` and bridges
// both plain HTTP and the exam-room WebSocket through to the backend.
//
// Local dev uses Vite's own proxy (vite.config.ts); this file is only the
// container's runtime after `vite build`.

// Every knob comes from the environment; the values themselves live in exactly
// one place — the image's ENV block (see Containerfile), overridden per
// deployment by hezarfen_frontend.env. Boot refuses rather than guessing: a
// missing value here means the image was stripped or the process was started
// outside it, and silently binding :5000-style defaults hides that.
function required(name: string): string {
  const value = Bun.env[name];
  if (!value) {
    console.error(
      `${name} is not set. The image supplies the defaults (see the ENV block in Containerfile); ` +
      `set ${name} in hezarfen_frontend.env to override them.`,
    );
    process.exit(1);
  }
  return value;
}

const PORT = Number(required("PORT"));
const HOST = required("HOST");
const BACKEND_ORIGIN = required("BACKEND_ORIGIN");
const BACKEND_HTTP = BACKEND_ORIGIN.replace(/\/+$/, "");
const BACKEND_WS = BACKEND_HTTP.replace(/^http/, "ws");
function backendHost(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    console.error(`BACKEND_ORIGIN is not a valid URL: ${origin}`);
    process.exit(1);
  }
}

const BACKEND_HOST = backendHost(BACKEND_HTTP);

const DIST = `${import.meta.dir}/dist`;

// Strip the /api prefix exactly like nginx did (rewrite ^/api(/.*)$ -> $1),
// so /api/exams/x -> /exams/x and /api -> "".
function backendPath(url: URL): string {
  return url.pathname.replace(/^\/api(?=\/|$)/, "") + url.search;
}

function isApi(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

// One held-open client socket to the backend per browser socket. Frames are
// piped both ways; messages that arrive before the upstream finishes its
// handshake are queued, not dropped.
type Bridge = {
  upstream: WebSocket;
  ready: boolean;
  queue: (string | Uint8Array)[];
};

// Sent on every file this server answers itself (the SPA shell and its
// assets). Framing is limited to our own origin: the app embeds same-origin
// file previews, but no other site may frame it (clickjacking). HSTS is only
// honoured over HTTPS, i.e. behind the TLS-terminating proxy in production.
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
};

async function serveStatic(pathname: string): Promise<Response> {
  // No path traversal out of dist.
  if (pathname.includes("..")) return new Response("bad request", { status: 400, headers: SECURITY_HEADERS });
  const rel = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(DIST + rel);
  if (await file.exists()) {
    const headers: Record<string, string> = { ...SECURITY_HEADERS };
    // Vite emits content-hashed files under /assets — safe to cache forever.
    if (rel.startsWith("/assets/")) headers["Cache-Control"] = "public, max-age=31536000, immutable";
    else if (rel === "/index.html") headers["Cache-Control"] = "no-store";
    return new Response(file, { headers });
  }
  // A missing hashed asset must stay a 404. Returning index.html here makes
  // browsers report a misleading "failed to fetch dynamically imported
  // module" because they receive HTML where JavaScript was requested.
  if (rel.startsWith("/assets/")) return new Response("asset not found", { status: 404, headers: SECURITY_HEADERS });
  // SPA fallback: unknown non-asset paths are client routes, serve the shell.
  return new Response(Bun.file(`${DIST}/index.html`), { headers: { ...SECURITY_HEADERS, "Cache-Control": "no-store" } });
}

async function proxyHttp(req: Request, url: URL): Promise<Response> {
  const target = BACKEND_HTTP + backendPath(url);
  const headers = new Headers(req.headers);
  // Let fetch set Host from the target; forwarding the browser's Host confuses
  // the backend's absolute-URL / cookie-domain logic.
  headers.set("host", BACKEND_HOST);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const resp = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    // Stream the request body instead of buffering it (uploads).
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);
  return resp;
}

const server = Bun.serve<Bridge>({
  port: PORT,
  hostname: HOST,
  // Long-running exam sockets must not be reaped by an idle timeout; the
  // backend sends its own periodic state ticks but a quiet client can still
  // sit for minutes between frames.
  idleTimeout: 0,
  async fetch(req, srv) {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return new Response("bad request", { status: 400 });
    }

    if (isApi(url.pathname)) {
      // WebSocket upgrade (/api/exams/:id/attempt/ws): open the upstream and
      // bridge. Forward the session cookie — it's what authenticates the WS.
      if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
        const cookie = req.headers.get("cookie") ?? undefined;
        const proto = req.headers.get("sec-websocket-protocol") ?? undefined;
        // SAFETY: Bun's WebSocket constructor accepts a protocol string array,
        // while its DOM declaration selects an incompatible overload here.
        const upstream = new WebSocket(BACKEND_WS + backendPath(url), {
          headers: cookie ? { cookie } : undefined,
          ...(proto ? { protocols: proto.split(",").map((p) => p.trim()) } : {}),
        } as unknown as string[]);
        const bridge: Bridge = { upstream, ready: false, queue: [] };
        const ok = srv.upgrade(req, { data: bridge });
        if (ok) return undefined;
        upstream.close();
        return new Response("websocket upgrade failed", { status: 426 });
      }
      return proxyHttp(req, url);
    }

    return serveStatic(url.pathname);
  },
  websocket: {
    open(ws) {
      const b = ws.data;
      b.upstream.onopen = () => {
        b.ready = true;
        for (const m of b.queue) {
          // SAFETY: Bun accepts Uint8Array websocket frames at runtime; its
          // current DOM types reject ArrayBufferLike in this overload.
          b.upstream.send(m as unknown as ArrayBuffer);
        }
        b.queue.length = 0;
      };
      b.upstream.onmessage = (e) => {
        // e.data is string for text frames, ArrayBuffer/Uint8Array for binary.
        ws.send(e.data as string | Uint8Array);
      };
      b.upstream.onclose = (e) => ws.close(e.code || 1000, e.reason);
      b.upstream.onerror = () => {
        try {
          ws.close(1011, "upstream error");
        } catch {
          // socket already gone
        }
      };
    },
    message(ws, message) {
      const b = ws.data;
      if (b.ready) b.upstream.send(message);
      else b.queue.push(message);
    },
    close(ws, code, reason) {
      try {
        ws.data.upstream.close(code >= 1000 && code <= 4999 ? code : 1000, reason);
      } catch {
        // upstream already closed
      }
    },
  },
});

console.log(`serving dist/ on ${HOST}:${server.port}, proxying /api -> ${BACKEND_HTTP}`);
