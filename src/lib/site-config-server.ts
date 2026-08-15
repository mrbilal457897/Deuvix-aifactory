import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { DEFAULTS, type SiteConfig } from "./site-config";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(DATA_DIR, "site-config.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function readSiteConfig(): Promise<SiteConfig> {
  await ensureDataDir();
  let custom: SiteConfig = {};
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    custom = JSON.parse(raw);
  } catch {
    // No saved config yet.
  }

  const merged: SiteConfig = { ...DEFAULTS, ...custom };

  // A saved reference may point to a file that doesn't exist on this
  // deployment (e.g. uploads cleaned up or never committed). Fall back to the
  // bundled default for that slot so images never 404.
  for (const key of Object.keys(custom)) {
    const value = merged[key];
    if (typeof value !== "string" || !value.startsWith("/")) continue;
    const resolved = path.resolve(PUBLIC_DIR, "." + value);
    const insidePublic =
      resolved === PUBLIC_DIR || resolved.startsWith(PUBLIC_DIR + path.sep);
    if (!insidePublic || !existsSync(resolved)) {
      merged[key] = DEFAULTS[key] ?? DEFAULTS.logo;
    }
  }

  return merged;
}

export async function writeSiteConfig(config: SiteConfig): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}
