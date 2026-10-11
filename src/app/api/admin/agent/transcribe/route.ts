import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { aiConfig } from "@/lib/ai/config";
import { transcribeAudio, VoiceError } from "@/lib/ai/voice";
import { normalizeLanguage } from "@/lib/ai/voice-languages";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Speech-to-text for the admin agent. Returns a transcript for the admin to
 * review in the input box — this route never sends a message or runs a tool.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`ai-voice-ip:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.ok || !auth.ctx) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }
  if (!checkRateLimit(`ai-voice-admin:${auth.ctx.adminEmail}`, aiConfig.rateLimit)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  // Reject oversized uploads before reading the body into memory.
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > aiConfig.sttMaxUploadBytes) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio was provided." }, { status: 400 });
  }
  if (file.size > aiConfig.sttMaxUploadBytes) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }

  const language = normalizeLanguage(String(form.get("language") || "auto"));

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await transcribeAudio(bytes, file.type || "audio/webm", language);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof VoiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
  }
}
