import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

// The dev server proxies `/api/*` to the backend so the browser talks to a
// single origin — the session cookie needs no cross-site handling. Deploy the
// same way: static files + a reverse proxy mapping /api to the backend.
export default defineConfig({
  plugins: [solid()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        // The exam room is a WebSocket under the same prefix.
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    target: "esnext",
  },
});
