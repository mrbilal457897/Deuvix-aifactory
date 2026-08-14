import { NextResponse } from "next/server";
import { readSiteConfig, writeSiteConfig } from "@/lib/site-config-server";

export async function GET() {
  const config = await readSiteConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const current = await readSiteConfig();
  const updated = { ...current, ...body };
  await writeSiteConfig(updated);
  return NextResponse.json(updated);
}
