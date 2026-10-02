/**
 * Writes DATABASE_URL into .env.local and immediately smoke-tests the connection.
 *
 *   npx tsx scripts/set-database-url.ts "postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"
 *
 * Get that string from Supabase -> Project -> Connect -> OR
 * Settings -> Database -> Connection string -> "Session pooler".
 *
 * Use the SESSION pooler on port 5432. The transaction pooler on 6543 is not
 * compatible with `pg`, which uses prepared statements.
 *
 * The password is never echoed; only the host is printed.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Client } from "pg";

loadEnvConfig(process.cwd());

const raw = (process.argv[2] ?? "").trim();

function fail(msg: string): never {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

async function main() {
  if (!raw) {
    fail(
      "no connection string given.\n  Usage: npx tsx scripts/set-database-url.ts \"postgresql://...\"\n" +
        "  Source: Supabase -> Settings -> Database -> Connection string -> Session pooler",
    );
  }

  if (!/^postgres(ql)?:\/\//i.test(raw)) {
    fail(`not a postgres:// URL (got "${raw.slice(0, 24)}...")`);
  }

  const url = new URL(raw);
  if (!url.hostname) fail("URL has no hostname");
  if (url.hostname.includes("supabase.co")) {
    if (url.port === "6543") {
      fail(
        "this is the TRANSACTION pooler (port 6543), which breaks `pg` prepared statements.\n" +
          "  Switch the dashboard dropdown to the Session pooler and use port 5432.",
      );
    }
    url.port = "5432";
  }

  // Supabase refuses non-TLS connections.
  if (!url.searchParams.get("sslmode")) url.searchParams.set("sslmode", "require");

  // Round-tripping through URL can re-encode characters; keep the sanitised form.
  const finalUrl = url.toString();

  const envPath = path.join(process.cwd(), ".env.local");
  let contents = "";
  try {
    contents = await readFile(envPath, "utf8");
  } catch {
    fail(".env.local not found in the project root");
  }

  const line = `DATABASE_URL=${finalUrl}`;
  if (/^\s*DATABASE_URL\s*=.*$/m.test(contents)) {
    contents = contents.replace(/^\s*DATABASE_URL\s*=.*$/m, line);
  } else {
    contents = `${contents.replace(/\s*$/, "")}\n\n# --- Database (PostgreSQL) ---\n${line}\n`;
  }
  await writeFile(envPath, contents, "utf8");
  console.log(`\n  wrote DATABASE_URL into .env.local  (${url.hostname}:${url.port})`);

  // --- smoke test ---
  const client = new Client({ connectionString: finalUrl, connectionTimeoutMillis: 15_000 });
  try {
    await client.connect();
    const ver = await client.query<{ version: string }>("SELECT version()");
    const who = await client.query<{ current_user: string; rls: string }>(
      "SELECT current_user, (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS rls",
    );
    const u = who.rows[0];
    const bypass = u.rls === "t";

    console.log(`  connected OK  (user=${u.current_user}, bypassrls=${bypass})`);
    console.log(`  ${ver.rows[0].version.split(",")[0]}`);

    if (!bypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(
        "\n  WARNING: this role does NOT bypass RLS. The bookings table is RLS-enabled,\n" +
          "  so queries will return 0 rows. Use the postgres role, not a non-superuser role.",
      );
    }
  } catch (err) {
    console.error(`\n  connection FAILED: ${err instanceof Error ? err.message : String(err)}`);
    console.error("  DATABASE_URL has been written anyway - fix the credentials and re-run.");
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }

  console.log("\n  next: npm run db:migrate\n");
}

main().catch((err) => {
  console.error("[set-database-url] unexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});