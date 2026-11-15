/**
 * Export a JSON snapshot of every known Supabase table.
 *
 * Usage (from repo root, with a populated .env.local):
 *   node scripts/export-backup.mjs [outputDir]
 *
 * Writes backups/supabase-<ISO timestamp>.json by default. The output dir is
 * git-ignored. The dump contains LIVE DATA (PII) — store it securely and
 * delete copies you no longer need. Never upload it.
 *
 * This talks to Supabase with the SERVICE ROLE from .env.local. No secrets
 * are printed; only row counts and bytes written.
 */
import fs from "node:fs";
import path from "node:path";

const env = {};
for (const raw of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 1) continue;
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[line.slice(0, i).trim()] = v;
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const base = url.replace(/\/+$/, "");

const TABLES = [
  "projects",
  "contacts",
  "leads",
  "follow_ups",
  "media",
  "site_config",
  "users",
  "agent_logs",
];

async function fetchTable(table) {
  const res = await fetch(`${base}/rest/v1/${table}?select=*&limit=100000`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${table}: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

const outDir = process.argv[2] || "backups";
fs.mkdirSync(outDir, { recursive: true });

const snapshot = { exportedAt: new Date().toISOString(), tables: {} };
let failed = 0;
for (const table of TABLES) {
  try {
    const rows = await fetchTable(table);
    snapshot.tables[table] = rows;
    console.log(`${table.padEnd(12)} rows=${rows.length}`);
  } catch (err) {
    failed += 1;
    console.error(`${table.padEnd(12)} FAILED: ${err.message}`);
    snapshot.tables[table] = null;
  }
}

const outFile = path.join(outDir, `supabase-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
const stat = fs.statSync(outFile);
console.log(`\nWrote ${outFile} (${(stat.size / 1024).toFixed(1)} KB)`);
if (failed > 0) process.exitCode = 1;
