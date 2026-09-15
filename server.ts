// Production server: serve the built SPA and reverse-proxy /api/* to the
// backend, so the browser stays same-origin (session cookies, no CORS). This
// replaces the old nginx image — Bun serves the static `dist/` and bridges
// both plain HTTP and the exam-room WebSocket through to the backend.
//
// Local dev uses Vite's own proxy (vite.config.ts); this file is only the
// container's runtime after `vite build`.

const PORT = Number(Bun.env.PORT ?? 5173);
// Interface to bind. 0.0.0.0 is what a published container port needs; under
// host networking the process sits directly on the host, so a server sets
// HOST=127.0.0.1 and only the reverse proxy beside it can reach the app.
const HOST = Bun.env.HOST ?? "0.0.0.0";
// Where the backend lives. The default is the co-located backend a server
// publishes on its own loopback (the compose stack maps 127.0.0.1:7656), which
// is what the frontend container reaches under host networking. Override with
// BACKEND_ORIGIN for anything else.
const BACKEND_ORIGIN = Bun.env.BACKEND_ORIGIN ?? "http://127.0.0.1:7656";
const BACKEND_HTTP = BACKEND_ORIGIN.replace(/\/+$/, "");
const BACKEND_WS = BACKEND_HTTP.replace(/^http/, "ws");
const BACKEND_HOST = new URL(BACKEND_HTTP).host;

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

async function serveStatic(pathname: string): Promise<Response> {
  // No path traversal out of dist.
  if (pathname.includes("..")) return new Response("bad request", { status: 400 });
  const rel = pathname === "/" ? "/index.html" : pathname;
  const file = Bun.file(DIST + rel);
  if (await file.exists()) {
    const headers: Record<string, string> = {};
    // Vite emits content-hashed files under /assets — safe to cache forever.
    if (rel.startsWith("/assets/")) headers["Cache-Control"] = "public, max-age=31536000, immutable";
    else if (rel === "/index.html") headers["Cache-Control"] = "no-store";
    return new Response(file, { headers });
  }
  // SPA fallback: unknown paths are client routes, serve the shell.
  return new Response(Bun.file(`${DIST}/index.html`), { headers: { "Cache-Control": "no-store" } });
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

const server = Bun.serve<Bridge, {}>({
  port: PORT,
  hostname: HOST,
  // Long-running exam sockets must not be reaped by an idle timeout; the
  // backend sends its own periodic state ticks but a quiet client can still
  // sit for minutes between frames.
  idleTimeout: 0,
  async fetch(req, srv) {
    const url = new URL(req.url);

    if (isApi(url.pathname)) {
      // WebSocket upgrade (/api/exams/:id/attempt/ws): open the upstream and
      // bridge. Forward the session cookie — it's what authenticates the WS.
      if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
        const cookie = req.headers.get("cookie") ?? undefined;
        const proto = req.headers.get("sec-websocket-protocol") ?? undefined;
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
        for (const m of b.queue) b.upstream.send(m);
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
