import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

const target = "http://127.0.0.1:8080";

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
    // is served by nginx with its own cache headers.
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      "/api": {
        target,
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ""),
      },
    },
  },
  build: {
    target: "esnext",
  },
});
