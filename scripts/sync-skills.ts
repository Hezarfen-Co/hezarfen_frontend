#!/usr/bin/env bun
/**
 * Mirror `.claude/skills/` → `.codex/skills/`.
 *
 * `.claude/skills/` is the single source of truth (Claude Code auto-loads it).
 * Codex reads the identical copy under `.codex/skills/`. Skills are hand-edited
 * in `.claude/` and this script keeps `.codex/` byte-identical so the two never
 * drift.
 *
 *   bun run sync-skills          # copy .claude/skills → .codex/skills
 *   bun run sync-skills --check  # exit 1 if they differ (no writes) — for CI/hooks
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, rmSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = ".claude/skills";
const DST = ".codex/skills";
const check = process.argv.includes("--check");

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const srcFiles = walk(SRC).map((p) => relative(SRC, p));
const dstFiles = walk(DST).map((p) => relative(DST, p));

if (!existsSync(SRC)) {
  console.error(`✗ source ${SRC}/ does not exist`);
  process.exit(1);
}

if (check) {
  const drift: string[] = [];
  for (const rel of new Set([...srcFiles, ...dstFiles])) {
    const s = existsSync(join(SRC, rel)) ? readFileSync(join(SRC, rel), "utf8") : null;
    const d = existsSync(join(DST, rel)) ? readFileSync(join(DST, rel), "utf8") : null;
    if (s !== d) drift.push(rel);
  }
  if (drift.length) {
    console.error("✗ .codex/skills is out of sync with .claude/skills:");
    for (const f of drift) console.error(`    ${f}`);
    console.error("  run: bun run sync-skills");
    process.exit(1);
  }
  console.log("✓ .claude/skills and .codex/skills are in sync");
  process.exit(0);
}

// sync mode: make DST a byte-identical mirror of SRC
for (const rel of srcFiles) {
  const from = join(SRC, rel);
  const to = join(DST, rel);
  mkdirSync(join(to, ".."), { recursive: true });
  writeFileSync(to, readFileSync(from));
}
// remove DST files that no longer exist in SRC
for (const rel of dstFiles) {
  if (!srcFiles.includes(rel)) rmSync(join(DST, rel));
}
console.log(`✓ synced ${srcFiles.length} skill file(s) → ${DST}`);
