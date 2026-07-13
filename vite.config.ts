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
