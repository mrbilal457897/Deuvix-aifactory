/**
 * Regenerates src/lib/db/supabase-ca.ts from certs/supabase-ca.pem.
 *
 *   npm run ca:embed
 *
 * Run this after replacing certs/supabase-ca.pem with a freshly downloaded
 * certificate from Supabase -> Settings -> Database -> SSL Configuration. The
 * generated module is what the server actually imports, so this step is
 * required for a rotated CA to take effect.
 *
 * Verifies the input is a certificate rather than a private key before writing,
 * since a key must never reach the repository.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const PEM_PATH = path.join("certs", "supabase-ca.pem");
const OUT_PATH = path.join("src", "lib", "db", "supabase-ca.ts");

function fail(msg: string): never {
  console.error(`\n  ERROR: ${msg}\n`);
  process.exit(1);
}

async function main() {
  let pem: string;
  try {
    pem = readFileSync(PEM_PATH, "utf8").trim();
  } catch {
    fail(`${PEM_PATH} not found. Download it from Supabase -> Settings -> Database -> SSL Configuration.`);
  }

  if (pem.includes("PRIVATE KEY")) {
    fail(`${PEM_PATH} contains a PRIVATE KEY. Refusing to write it into source control.`);
  }
  if (!pem.startsWith("-----BEGIN CERTIFICATE-----") || !pem.includes("-----END CERTIFICATE-----")) {
    fail(`${PEM_PATH} is not a PEM certificate.`);
  }

  const header = `/**
 * Supabase's CA certificate, embedded so it ships with the server bundle.
 *
 * GENERATED FILE - do not edit by hand. Run \`npm run ca:embed\` after replacing
 * certs/supabase-ca.pem.
 *
 * Why not read certs/supabase-ca.pem from disk at runtime? Next.js only traces
 * files it can see referenced statically, so a path handed to \`pg\` through the
 * connection string (sslrootcert) is silently dropped from the deployment
 * bundle and Postgres connections fail with "self-signed certificate in
 * certificate chain". A bundled module is always included, on Vercel and in the
 * Docker/standalone image alike.
 *
 * This is a PUBLIC certificate, not a private key, so committing it is safe.
 *
 * Passing \`ssl\` next to \`connectionString\` only works while DATABASE_URL
 * carries no sslmode/sslrootcert of its own - pg gives the URL priority, and
 * \`sslmode=require\` alone resolves to verify-full against the system trust
 * store, which does not contain this CA.
 */
export const SUPABASE_CA_PEM = \``;

  writeFileSync(OUT_PATH, `${header}${pem}\`;\n`, "utf8");

  // Confirm the emitted module still parses and exports the expected value.
  const { SUPABASE_CA_PEM: emitted } = await import("../src/lib/db/supabase-ca");
  if (emitted.replace(/\s/g, "") !== pem.replace(/\s/g, "")) {
    fail("generated module does not match the source certificate.");
  }

  console.log(`  wrote ${OUT_PATH} from ${PEM_PATH}`);
}

main().catch((err) => {
  console.error("[embed-ca]", err instanceof Error ? err.message : err);
  process.exit(1);
});