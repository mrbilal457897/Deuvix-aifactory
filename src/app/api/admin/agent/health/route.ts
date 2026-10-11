import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { checkLlmHealth } from "@/lib/ai/health";
import { checkSttHealth } from "@/lib/ai/voice";
import { checkTtsHealth } from "@/lib/ai/tts";
import { listSkills } from "@/lib/ai/skills";
import { toolCatalog } from "@/lib/ai/tools/registry";

export const runtime = "nodejs";

/** Admin-only reachability probe for the model + voice servers, used by the panel UI. */
export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const [health, stt, tts] = await Promise.all([
    checkLlmHealth(),
    checkSttHealth(),
    checkTtsHealth(),
  ]);
  return NextResponse.json({
    ...health,
    stt,
    tts,
    skills: listSkills().map((s) => s.name),
    tools: toolCatalog().map((t) => t.name),
  });
}
