import { NextResponse } from "next/server";
import { SERVER_CARD, SERVER_CARD_HEADERS } from "@/lib/mcp/server-card";

/** Legacy discovery alias — same document as /.well-known/mcp/server-card.json. */
export const dynamic = "force-static";

export function GET() {
  return new NextResponse(JSON.stringify(SERVER_CARD), { status: 200, headers: SERVER_CARD_HEADERS });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: SERVER_CARD_HEADERS });
}
