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
    proxy: Object.fromEntries(
      ["/auth", "/users", "/notes", "/events", "/exams", "/courses", "/marks", "/health"].map((p) => [
        p,
        { target, changeOrigin: true },
      ]),
    ),
  },
  build: {
    target: "esnext",
  },
});
