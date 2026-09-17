import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// Keep zero-config local development usable even when the Rust backend is not
// running on this machine. Deployments use server.ts and the image-level
// BACKEND_ORIGIN instead; developers can still opt into a local backend with
// BACKEND_ORIGIN=http://127.0.0.1:7656 bun run dev.
const target = process.env.BACKEND_ORIGIN ?? "https://hezarfen-backend.dizey.sh";

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
        // Direct backends (local or public) speak unprefixed routes, so strip
        // /api. The public frontend origin terminates /api itself — stripping
        // there hits the SPA HTML instead of the API.
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
