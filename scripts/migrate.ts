/**
 * Applies every .sql file in /drizzle in filename order, inside a transaction,
 * and records what ran in a _migrations table so re-runs are safe.
 *
 *   npm run db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. Add it to .env.local before running migrations.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();
  console.log("[migrate] connected");

  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("[migrate] no .sql files found in drizzle/");
    await client.end();
    return;
  }

  const applied = new Set(
    (await client.query<{ name: string }>("SELECT name FROM _migrations")).rows.map((r) => r.name),
  );

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip ${file} (already applied)`);
      continue;
    }

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrate] applied ${file}`);
      ran += 1;
    } catch (err) {
      await client.query("ROLLBACK");
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[migrate] FAILED ${file}: ${message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(ran > 0 ? `[migrate] done, ${ran} migration(s) applied` : "[migrate] already up to date");
}

main().catch((err) => {
  console.error("[migrate] unexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
