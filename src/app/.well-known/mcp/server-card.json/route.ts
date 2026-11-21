import { NextResponse } from "next/server";
import { SERVER_CARD } from "@/lib/mcp/server-card";

export const dynamic = "force-static";

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
  "Cache-Control": "public, max-age=3600",
  ETag: '"deuvix-mcp-server-card-v1"',
};

export function GET() {
  return new NextResponse(JSON.stringify(SERVER_CARD), { status: 200, headers: HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS });
}
