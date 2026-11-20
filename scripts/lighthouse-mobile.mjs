#!/usr/bin/env node
/**
 * Run Lighthouse MOBILE audits (default 3 runs, median per page).
 *
 * Usage:
 *   node scripts/lighthouse-mobile.mjs [--base http://localhost:3000] [--runs 3] [path ...]
 *
 * Without paths, audits the standard 8 marketing pages.
 * Writes docs/reports/mobile-summary.json plus per-run JSON.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BASE = getFlag("--base", "http://localhost:3000").replace(/\/$/, "");
const RUNS = Number(getFlag("--runs", "3"));
const pages = argv.filter((a) => !a.startsWith("--") && !/^\d+$/.test(a) && !a.startsWith("http"));
const DEFAULT_PAGES = ["/", "/products", "/projects", "/projects/restoran", "/about", "/blog", "/contact", "/book-a-call"];
const targets = pages.length ? pages : DEFAULT_PAGES;

const outDir = path.join("docs", "reports", "mobile");
fs.mkdirSync(outDir, { recursive: true });

const summary = {};
for (const page of targets) {
  const slug = page === "/" ? "home" : page.replace(/^\/|\/$/g, "").replace(/\//g, "-");
  const runs = [];
  for (let i = 1; i <= RUNS; i++) {
    const out = path.join(outDir, `${slug}-run${i}.json`);
    process.stdout.write(`  ${page} (run ${i}/${RUNS}) ... `);
    try {
      execFileSync(
        process.execPath,
        [
          path.join("node_modules", "lighthouse", "cli", "index.js"),
          `${BASE}${page}`,
          // Lighthouse 12 defaults to mobile emulation (Moto G Power, 4x CPU,
          // Slow 4G). --preset=desktop is the opt-out, so no preset here.
          "--quiet",
          "--chrome-flags=--no-sandbox --headless",
          "--output=json",
          `--output-path=${out}`,
        ],
        { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 128 * 1024 * 1024 },
      );
      const c = r.categories;
      const s = (k) => Math.round((c[k]?.score ?? 0) * 100);
      const a = (k) => r.audits?.[k];
      const fmt = (v) => (typeof v === "number" ? +(v / 1000).toFixed(2) : null);
      const lcpEl = a("largest-contentful-paint-element")?.details?.items?.[0]?.items?.[0]?.node?.snippet ?? null;
      const rec = {
        perf: s("performance"),
        fcp: fmt(a("first-contentful-paint")?.numericValue),
        lcp: fmt(a("largest-contentful-paint")?.numericValue),
        tbt: a("total-blocking-time")?.numericValue ?? null,
        cls: a("cumulative-layout-shift")?.numericValue ?? null,
        si: fmt(a("speed-index")?.numericValue),
        lcpEl,
      };
      runs.push(rec);
      process.stdout.write(`perf=${rec.perf} lcp=${rec.lcp}s tbt=${Math.round(rec.tbt)}ms\n`);
    } catch (e) {
      process.stdout.write("FAILED\n");
      runs.push(null);
    }
  }
  const ok = runs.filter(Boolean);
  if (ok.length) {
    const med = (arr) => {
      const s = [...arr].sort((a, b) => a - b);
      return s[Math.floor(s.length / 2)];
    };
    summary[page] = {
      perf: med(ok.map((r) => r.perf)),
      fcp: med(ok.map((r) => r.fcp)),
      lcp: med(ok.map((r) => r.lcp)),
      tbt: Math.round(med(ok.map((r) => r.tbt))),
      cls: med(ok.map((r) => r.cls)),
      si: med(ok.map((r) => r.si)),
      lcpEl: ok[0]?.lcpEl ?? null,
    };
  }
}

console.log("\n=== MOBILE MEDIAN SUMMARY ===");
for (const [page, m] of Object.entries(summary)) {
  console.log(
    `${page.padEnd(20)} perf=${m.perf}  FCP=${m.fcp}s  LCP=${m.lcp}s  TBT=${m.tbt}ms  CLS=${m.cls}  SI=${m.si}s  lcpEl=${m.lcpEl ?? "?"}`,
  );
}
fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
