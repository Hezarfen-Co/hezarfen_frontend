import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// Mirror of backend route mounts (hezarfen_backend src/lib.rs .nest calls + /health, /time).
// Backend adds a prefix → add it here AND in nginx.conf's proxy location.
const BACKEND_PREFIXES = [
  "auth",
  "users",
  "notes",
  "events",
  "courses",
  "sessions",
  "exams",
  "marks",
  "work",
  "pomodoro",
  "attendance",
  "settings",
  "subjects",
  "terms",
  "health",
  "time",
];

test("nginx proxy whitelist covers every backend route prefix", () => {
  const conf = readFileSync(new URL("./nginx.conf", import.meta.url), "utf8");
  const match = conf.match(/\^\/api\/\(([^)]+)\)/);
  expect(match).not.toBeNull();
  const listed = match![1].split("|");
  for (const prefix of BACKEND_PREFIXES) {
    expect(listed).toContain(prefix);
  }
});
