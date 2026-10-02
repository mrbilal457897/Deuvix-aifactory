import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { SUPABASE_CA_PEM } from "./supabase-ca";

type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __deuxPgPool?: Pool;
  __deuxDb?: Database;
};

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool(): Pool {
  if (globalForDb.__deuxPgPool) return globalForDb.__deuxPgPool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add it.");
  }

  // Supabase's pooler serves a certificate signed by a Supabase-managed CA that
  // is not in Node's trust store, so the server has to be told to trust it
  // explicitly. The CA lives in ./supabase-ca (embedded, so it survives bundling)
  // and it is applied here rather than through the URL, because pg gives
  // `connectionString` priority over an `ssl` option — DATABASE_URL must therefore
  // carry no sslmode/sslrootcert of its own.
  //
  // A self-hosted Postgres presents a publicly trusted certificate, so pointing
  // DATABASE_URL at one without the CA must keep working; opt out with
  // DATABASE_SSL=off.
  const ssl =
    process.env.DATABASE_SSL?.trim().toLowerCase() === "off"
      ? undefined
      : { ca: SUPABASE_CA_PEM, rejectUnauthorized: true as const };

  const pool = new Pool({
    connectionString,
    ...(ssl ? { ssl } : {}),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: false,
  });

  pool.on("error", (err) => {
    console.error("[db] idle client error:", err instanceof Error ? err.message : err);
  });

  globalForDb.__deuxPgPool = pool;
  return pool;
}

export function getDb(): Database {
  if (globalForDb.__deuxDb) return globalForDb.__deuxDb;
  const db = drizzle(getPool(), { schema });
  globalForDb.__deuxDb = db;
  return db;
}

/**
 * Runs a database operation, logging and re-throwing with context. Webhook
 * handlers use this so a failure is visible in logs but never leaks config.
 */
export async function withDb<T>(label: string, fn: (db: Database) => Promise<T>): Promise<T> {
  try {
    return await fn(getDb());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[db:${label}] ${message}`);
    throw new Error(`Database operation "${label}" failed`);
  }
}