import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { submitLead } from "@/lib/chat/lead-handoff";
import { uiStrings } from "@/lib/chat/ui-strings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  // Deliberately tighter than /api/chat — a lead form is a spam magnet.
  if (!checkRateLimit(`lead:${ip}`, 3, 60_000)) {
    return NextResponse.json({ ok: false, message: uiStrings.rateLimited }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: uiStrings.leadError }, { status: 400 });
  }

  const result = await submitLead(body);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, message: result.message, field: result.field },
      { status: result.field ? 400 : 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
