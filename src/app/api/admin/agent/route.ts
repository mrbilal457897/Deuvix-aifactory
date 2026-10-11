import { NextResponse } from "next/server";
import { z } from "zod";
import type { ModelMessage } from "ai";
import { requireAdmin } from "@/lib/ai/auth";
import { aiConfig } from "@/lib/ai/config";
import { checkLlmHealth } from "@/lib/ai/health";
import { runAdminAgent } from "@/lib/ai/agent";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        // Empty content is tolerated here and stripped below: a model error can
        // leave an empty assistant turn in the client history, and that must not
        // wedge every following request.
        content: z.string().max(8000),
      }),
    )
    .min(1)
    .max(24),
  inputMode: z.enum(["text", "voice"]).optional(),
  /** Which LLM provider to use; validated against the built-in allowlist. */
  provider: z.enum(["gemini", "groq", "ollama"]).optional(),
  /** Reviewed voice transcript; shown to the model as the user's turn. */
  transcript: z.string().max(8000).optional(),
});

function ndjsonResponse(generator: AsyncGenerator<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client disconnected — nothing more to write.
        }
      };
      try {
        for await (const event of generator) send(event);
      } catch {
        send({ type: "error", message: "Unexpected error. Please try again." });
      } finally {
        send({ type: "done" });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`ai-ip:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.ok || !auth.ctx) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  if (!checkRateLimit(`ai-admin:${auth.ctx.adminEmail}`, aiConfig.rateLimit)) {
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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request body" }, { status: 400 });
  }
  const body = parsed.data;

  // Drop empty turns (a failed model call can leave one behind) before use.
  const turns = body.messages.filter((m) => m.content.trim().length > 0);
  if (turns.length === 0) {
    return NextResponse.json({ error: "Please enter a message." }, { status: 400 });
  }

  const last = turns[turns.length - 1];
  if (last.role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user." }, { status: 400 });
  }
  if (last.content.length > aiConfig.maxInputChars) {
    return NextResponse.json(
      { error: `Message is too long (max ${aiConfig.maxInputChars} characters).` },
      { status: 400 },
    );
  }

  // Fail fast with a clean signal instead of a broken stream.
  const health = await checkLlmHealth(body.provider);
  if (!health.ok) {
    return NextResponse.json({ error: "AI offline", health }, { status: 503 });
  }

  const messages: ModelMessage[] = turns
    .slice(-aiConfig.historyWindow)
    .map((m) => ({ role: m.role, content: m.content }));

  const generator = runAdminAgent({
    messages,
    ctx: auth.ctx,
    inputMode: body.inputMode ?? "text",
    provider: body.provider,
    prompt: last.content,
    transcript: body.transcript,
    signal: request.signal,
  });

  return ndjsonResponse(generator);
}
