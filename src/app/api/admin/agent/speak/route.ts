import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/ai/auth";
import { aiConfig } from "@/lib/ai/config";
import { synthesizeSpeech, TtsError } from "@/lib/ai/tts";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().max(64).optional(),
});

/**
 * Text-to-speech for the admin agent. Optional: returns 501 when no TTS server is
 * configured, and the client falls back to the browser's SpeechSynthesis.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`ai-speak-ip:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.ok || !auth.ctx) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }
  if (!checkRateLimit(`ai-speak-admin:${auth.ctx.adminEmail}`, aiConfig.rateLimit)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!aiConfig.ttsEnabled) {
    return NextResponse.json({ error: "text-to-speech not configured" }, { status: 501 });
  }

  try {
    const { audio, contentType } = await synthesizeSpeech(parsed.data.text, parsed.data.voice);
    return new Response(Uint8Array.from(audio).buffer, {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (err) {
    if (err instanceof TtsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Speech synthesis failed." }, { status: 500 });
  }
}
