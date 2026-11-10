/**
 * Build-time guard: fails if any `localhost` (or 127.0.0.1 / 0.0.0.0) reference
 * appears in the public HTML produced by `next build`.
 *
 * Scans every .html file under .next/ — public pages, 404, error pages and
 * prerendered route shells. Route handlers (/api/*) and JS/CSS chunks are out
 * of scope: they never reach the visitor as rendered markup.
 *
 * Usage: npm run build && node scripts/check-localhost.mjs
 * Exits 1 and prints the offending files if a local URL leaks into the output.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const buildDir = join(root, ".next");

if (!existsSync(buildDir)) {
  console.error("[check-localhost] .next/ not found — run `npm run build` first.");
  process.exit(1);
}

const PATTERN = /localhost|127\.0\.0\.1|0\.0\.0\.0/gi;

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* htmlFiles(full);
    } else if (entry.name.endsWith(".html")) {
      yield full;
    }
  }
}

const offenders = [];

for (const file of htmlFiles(buildDir)) {
  const html = readFileSync(file, "utf8");
  const matches = html.match(PATTERN);
  if (matches && matches.length > 0) {
    offenders.push({ file: relative(root, file), count: matches.length });
  }
}

if (offenders.length > 0) {
  console.error("[check-localhost] localhost references found in public HTML:");
  for (const { file, count } of offenders) {
    console.error(`  ${file}  (${count} hit${count === 1 ? "" : "s"})`);
  }
  process.exit(1);
}

console.log("[check-localhost] OK — no localhost references in public HTML.");
process.exit(0);
