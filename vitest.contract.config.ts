import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Contract suite — runs against a REAL backend, never mocked fetch.
 * Excluded from `bun run test` (see `exclude` in vitest.config.ts).
 *
 * Boot a throwaway backend (do not point this at the container on :8080):
 *   ~/.surrealdb/surreal start --user root --pass root --bind 127.0.0.1:8100 memory
 *   cd <your hezarfen_backend checkout> && PORT=8081 DB_URL=ws://127.0.0.1:8100 \
 *     DB_USER=root DB_PASS=root ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 cargo run
 * Then:
 *   CONTRACT_BASE_URL=http://127.0.0.1:8081 bun run test:contract
 *
 * The backend repo is private and not cloned next to this one by default —
 * clone it anywhere, the path above is a placeholder.
 *
 * Without CONTRACT_BASE_URL the whole suite skips (green, not failed).
 * Optional: ADMIN_USERNAME / ADMIN_PASSWORD (default admin / admin123).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/api/__tests__/contract/**/*.contract.test.ts"],
    // The scratch backend rate-limits all requests from its loopback client.
    // Running files serially keeps a contract run deterministic and realistic.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
