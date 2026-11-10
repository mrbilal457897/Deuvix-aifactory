/**
 * Local helper: loads .env.local into process.env, then boots the standalone
 * server (Next.js `output: "standalone"` does not load env files by itself).
 * For production use your platform's own env management instead.
 */
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const file = path.join(process.cwd(), ".env.local");
if (existsSync(file)) {
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const require = createRequire(import.meta.url);
process.env.PORT = process.env.PORT || "3000";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
require(path.join(process.cwd(), ".next", "standalone", "server.js"));
