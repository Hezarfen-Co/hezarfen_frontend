import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Live-backend suite, run separately: `bun run test:contract`.
    exclude: ["**/node_modules/**", "**/dist/**", "src/api/__tests__/contract/**"],
  },
});
