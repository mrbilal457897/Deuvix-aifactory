import { NextResponse } from "next/server";
import { readSiteConfig, writeSiteConfig } from "@/lib/site-config-server";

export async function GET() {
  const config = await readSiteConfig();
  // Public, non-sensitive data — safe to cache at the edge/host for 5 minutes.
  return NextResponse.json(config, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readSiteConfig();
  const updated = { ...current, ...body };
  await writeSiteConfig(updated);
  return NextResponse.json(updated);
}
