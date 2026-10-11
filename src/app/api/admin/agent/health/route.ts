import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/ai/auth";
import { checkLlmHealth } from "@/lib/ai/health";
import { checkSttHealth } from "@/lib/ai/voice";
import { checkTtsHealth } from "@/lib/ai/tts";
import { listSkills } from "@/lib/ai/skills";
import { providerStatuses } from "@/lib/ai/providers";
import { toolCatalog } from "@/lib/ai/tools/registry";

export const runtime = "nodejs";

/** Admin-only reachability probe for the model + voice servers, used by the panel UI. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 401 });
  }

  const provider = new URL(request.url).searchParams.get("provider");
  const [health, stt, tts] = await Promise.all([
    checkLlmHealth(provider),
    checkSttHealth(),
    checkTtsHealth(),
  ]);
  return NextResponse.json({
    ...health,
    stt,
    tts,
    providers: providerStatuses(),
    skills: listSkills().map((s) => s.name),
    tools: toolCatalog().map((t) => t.name),
  });
}
