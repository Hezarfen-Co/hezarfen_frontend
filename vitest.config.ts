import path from "node:path";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

const alias = { "@": path.resolve(__dirname, "./src") };
// Live-backend suite, run separately: `bun run test:contract`.
const exclude = ["**/node_modules/**", "**/dist/**", "src/api/__tests__/contract/**", "src/components/layout/nav-items.test.ts"];

/**
 * Two projects, one `vitest run`: plain logic/API tests stay on the fast node
 * environment with no Solid transform, component tests (`*.test.tsx`) get jsdom
 * plus vite-plugin-solid. The split is by file extension so neither side can
 * accidentally pull the other's environment.
 */
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "node",
          globals: true,
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude,
        },
      },
      {
        // `hot: false`: the plugin otherwise injects solid-refresh's virtual
        // module, and vitest hands node the unresolvable `file:///@solid-refresh`
        // specifier — every *.test.tsx file failed to load on that alone. There
        // is no HMR in a test run for it to serve.
        plugins: [solid({ hot: false })],
        // "development"/"browser" so solid-js resolves to its client build once —
        // a dual-loaded solid-js gives components a different reactive graph.
        resolve: { alias, conditions: ["development", "browser"] },
        test: {
          name: "dom",
          globals: true,
          environment: "jsdom",
          environmentOptions: {
            jsdom: { url: "http://localhost/" },
          },
          setupFiles: ["./src/test-setup.ts"],
          include: ["src/**/*.test.tsx", "src/components/layout/nav-items.test.ts"],
          exclude,
        },
      },
    ],
  },
});
