#!/usr/bin/env node
/**
 * Run Lighthouse desktop audits (3 runs, median per page).
 * Usage: node scripts/lighthouse-audit.mjs [url ...]
 * Without args, audits the standard 8 pages on localhost:3100.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3100";
const DEFAULT_PAGES = ["/", "/products", "/projects", "/projects/restoran", "/about", "/blog", "/contact", "/book-a-call"];
const pages = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PAGES;
const outDir = path.join("docs", "reports");
fs.mkdirSync(outDir, { recursive: true });

const summary = {};
for (const page of pages) {
  const slug = page === "/" ? "home" : page.replace(/^\/|\/$/g, "").replace(/\//g, "-");
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const out = path.join(outDir, `${slug}-run${i}.json`);
    process.stdout.write(`  Auditing ${page} (run ${i}/3) ... `);
    try {
      execFileSync(
        process.execPath,
        [path.join("node_modules", "lighthouse", "cli", "index.js"), `${BASE}${page}`, "--preset=desktop", "--quiet", "--chrome-flags=--no-sandbox --headless", "--output=json", `--output-path=${out}`],
        { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PATH: `node_modules\\.bin;${process.env.PATH ?? ""}` } },
      );
      const r = JSON.parse(fs.readFileSync(out, "utf8"));
      const c = r.categories;
      const s = (k) => Math.round((c[k]?.score ?? 0) * 100);
      const a = (k) => r.audits?.[k];
      const fmt = (v) => (typeof v === "number" ? (v / 1000).toFixed(2) : "n/a");
      runs.push({
        perf: s("performance"),
        a11y: s("accessibility"),
        bp: s("best-practices"),
        seo: s("seo"),
        fcp: fmt(a("first-contentful-paint")?.numericValue),
        lcp: fmt(a("largest-contentful-paint")?.numericValue),
        tbt: a("total-blocking-time")?.numericValue,
        cls: a("cumulative-layout-shift")?.numericValue,
        speedIndex: a("speed-index")?.numericValue,
      });
      process.stdout.write(`perf=${runs[runs.length - 1].perf} lcp=${runs[runs.length - 1].lcp}s\n`);
    } catch (e) {
      process.stdout.write("FAILED\n");
      runs.push(null);
    }
  }
  const ok = runs.filter((r) => r);
  if (ok.length) {
    const med = (arr) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    summary[page] = {
      perf: med(ok.map((r) => r.perf)),
      fcp: med(ok.map((r) => Number(r.fcp))),
      lcp: med(ok.map((r) => Number(r.lcp))),
      tbt: med(ok.map((r) => Number(r.tbt))),
      cls: med(ok.map((r) => Number(r.cls))),
      speedIndex: med(ok.map((r) => Number(r.speedIndex))),
    };
  }
}
console.log("\n=== DESKTOP MEDIAN SUMMARY ===");
for (const [page, m] of Object.entries(summary)) {
  console.log(`${page.padEnd(20)} perf=${m.perf}  FCP=${m.fcp}s  LCP=${m.lcp}s  TBT=${m.tbt}ms  CLS=${m.cls}  SI=${m.speedIndex}ms`);
}
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
