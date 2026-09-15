import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const target = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:7656";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Chromium 150's HTTP cache deadlocks when a page that fans out to ~230
    // separately-served, `no-cache`-revalidated dev modules (kobalte/corvu
    // ship unbundled) is reloaded a handful of times in a row: after ~7
    // reloads its cache entries wedge and every later request queues in the
    // browser forever — no bytes ever reach vite. `no-store` stops Chromium
    // from creating the cache entries at all. Dev-only; the production build
    // is served by Bun (server.ts) with its own cache headers.
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
        ws: true,
        // Local Rust backend (e.g. :7656) speaks unprefixed routes, so strip
        // /api. The public origin terminates /api itself — stripping there
        // hits the SPA HTML instead of the API and breaks every local session
        // against the default BACKEND_ORIGIN.
        rewrite: (path) => {
          try {
            if (/hezarfen\.dizey\.sh$/i.test(new URL(target).host)) return path;
          } catch {
            /* keep strip fallback */
          }
          return path.replace(/^\/api(?=\/|$)/, "");
        },
      },
    },
  },
  build: {
    target: "esnext",
  },
});
