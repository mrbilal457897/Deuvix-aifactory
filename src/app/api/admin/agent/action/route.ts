import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/ai/auth";
import { aiConfig } from "@/lib/ai/config";
import { executeTool, getToolRisk, ToolExecutionError } from "@/lib/ai/tools/registry";
import { recordAudit } from "@/lib/ai/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({
  name: z.string().min(1).max(64),
  args: z.unknown().optional(),
});

/**
 * Runs a WRITE action the admin explicitly confirmed. This is the only endpoint
 * that can execute a write; the model itself can never reach it.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`ai-action-ip:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const auth = await requireAdmin();
  if (!auth.ok || !auth.ctx) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }
  if (!checkRateLimit(`ai-action-admin:${auth.ctx.adminEmail}`, aiConfig.rateLimit)) {
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
  const { name, args } = parsed.data;
  const risk = getToolRisk(name);
  const started = Date.now();

  try {
    const result = await executeTool(name, args ?? {}, auth.ctx);
    await recordAudit({
      adminId: auth.ctx.adminId,
      adminEmail: auth.ctx.adminEmail,
      inputMode: "text",
      prompt: `[confirmed] ${name}`,
      skillsLoaded: [],
      toolCalls: [{ name, risk, status: "ok", args, result }],
      status: "ok",
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const message = err instanceof ToolExecutionError ? err.message : "Action failed.";
    const status = err instanceof ToolExecutionError ? err.status : 500;
    await recordAudit({
      adminId: auth.ctx.adminId,
      adminEmail: auth.ctx.adminEmail,
      inputMode: "text",
      prompt: `[confirmed] ${name}`,
      skillsLoaded: [],
      toolCalls: [{ name, risk, status: "error", args, error: message }],
      status: "error",
      error: message,
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ error: message }, { status });
  }
}
