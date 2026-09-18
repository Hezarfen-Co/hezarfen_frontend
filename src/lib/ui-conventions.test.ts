import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guardrails for the UI rules in docs/ui and the ui-conventions skill. Each
 * one was broken somewhere before the 2026-09 UI pass fixed it; this keeps it
 * from drifting back.
 */
const SRC = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

const files = sourceFiles(SRC).map((path) => ({ path: relative(SRC, path), text: readFileSync(path, "utf8") }));
const offenders = (pattern: RegExp, allow: (path: string) => boolean = () => false) =>
  files.filter((file) => !allow(file.path) && pattern.test(file.text)).map((file) => file.path);

it("domain code renders tables through DataTable, not raw <table>", () => {
  // The insight run report is a print document; DataTable's toolbar and
  // phone card layout would break the printed page.
  expect(
    offenders(/<table[\s>]/, (path) => path.startsWith("components/ui/") || path === "components/insights/insight-run-report.tsx"),
  ).toEqual([]);
});

it("no text below 11px, bar the two avatar-initial circles", () => {
  expect(
    offenders(/text-\[(?:[0-9]|10)px\]/, (path) => path === "components/users/user-avatar.tsx" || path === "pages/questions-page.tsx"),
  ).toEqual([]);
});

it("colored text uses the contrast-safe -text tokens", () => {
  expect(offenders(/(?<![\w-])text-(?:primary|success|warning|info|destructive)(?![\w/-])/)).toEqual([]);
});

it("the back button never calls window.history.back()", () => {
  expect(offenders(/window\.history\.back\(\)/)).toEqual([]);
});

it("no native browser dialogs", () => {
  expect(offenders(/window\.(?:confirm|prompt|alert)\(/)).toEqual([]);
});
