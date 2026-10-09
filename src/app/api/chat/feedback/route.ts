import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { setFeedback } from "@/lib/chat/memory";

export const runtime = "nodejs";

const schema = z.object({
  messageId: z.string().uuid(),
  feedback: z.enum(["up", "down"]),
});

export async function POST(request: Request) {
  if (!checkRateLimit(`fb:${getClientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { userId?: string } | undefined)?.userId;
  if (!userId) {
    // Guests get the visual affordance only — nothing is written.
    return NextResponse.json({ ok: true, stored: false });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  await setFeedback(parsed.data.messageId, parsed.data.feedback);
  return NextResponse.json({ ok: true, stored: true });
}
